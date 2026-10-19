// HTTP integration tests require an isolated local PostgreSQL test database,
// local Supabase Auth/Storage, and a test app at PROFILE_TEST_ORIGIN.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  photoStorage,
  removePhoto,
} from "../../src/features/profile/server/storage";
import { users } from "../../src/lib/db/schema";

const origin = process.env.PROFILE_TEST_ORIGIN || "http://127.0.0.1:3001";
assert.equal(new URL(origin).hostname, "127.0.0.1");
const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
assert.ok(
  databaseUrl,
  "Set PROFILE_TEST_DATABASE_URL to an isolated local test database.",
);
assert.equal(new URL(databaseUrl).hostname, "127.0.0.1");
assert.match(
  new URL(databaseUrl).pathname,
  /test/i,
  "Never run against production data.",
);
assert.equal(
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname,
  "127.0.0.1",
  "Use local Supabase for photo integration tests.",
);
const photoExists = async (path: string) => {
  const { error } = await photoStorage().files.info(path);
  if (!error) return true;
  if (error.statusCode === "404" || error.statusCode === "400") return false;
  throw error;
};
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);
const created: string[] = [];
const paths = new Set<string>();
const values = {
  displayName: "Profile Tester",
  headline: "Student",
  bio: "Graph problems and small tools.",
  location: "Pune",
  organization: "Example University",
  website: "example.com",
  github: "github.com/profile-tester",
  linkedin: "linkedin.com/in/profile-tester",
  x: "x.com/profile_tester",
  codeforces: "tester",
  leetcode: "tester",
  atcoder: "tester",
  codechef: "",
};
interface TestUser {
  idToken: string;
  localId: string;
}
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function newUser(): Promise<TestUser> {
  const email = `profile-${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  assert.ok(data.user);
  created.push(data.user.id);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signed.error);
  assert.ok(signed.data.session);
  return { localId: data.user.id, idToken: signed.data.session.access_token };
}

const get = (user: TestUser, path = "/api/profile") =>
  fetch(`${origin}${path}`, {
    headers: { Authorization: `Bearer ${user.idToken}` },
  });
async function save(
  user: TestUser,
  revision: number,
  edits = {},
  photo: Blob | null = null,
  action = "keep",
) {
  const body = new FormData();
  body.set("profile", JSON.stringify({ ...values, ...edits }));
  body.set("revision", String(revision));
  body.set("avatarAction", action);
  if (photo) body.set("avatar", photo, "profile.png");
  return fetch(`${origin}/api/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${user.idToken}` },
    body,
  });
}
const account = async (user: TestUser) =>
  (await db.select().from(users).where(eq(users.id, user.localId)))[0];
try {
  assert.equal((await fetch(`${origin}/api/profile`)).status, 401);
  assert.equal((await get({ idToken: "invalid", localId: "" })).status, 401);
  const [user, other] = await Promise.all([newUser(), newUser()]);
  assert.equal((await get(user, "/api/profile/photo")).status, 404);
  let response = await save(user, 0);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).profile.revision, 1);
  assert.equal((await account(user)).profile?.website, "https://example.com/");
  for (const edits of [
    { displayName: "" },
    { bio: "x".repeat(301) },
    { website: "javascript:alert(1)" },
    { github: "https://github.com.evil.test/user" },
  ])
    assert.equal((await save(user, 1, edits)).status, 400);
  assert.equal((await save(user, 0)).status, 409);
  assert.equal(
    (await save(user, 1, {}, new Blob(["bad image"], { type: "image/png" })))
      .status,
    400,
  );
  const image = new Blob(
    [new Uint8Array(await readFile("public/coding.png"))],
    { type: "image/png" },
  );
  response = await save(user, 1, {}, image);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).profile.avatarMode, "custom");
  const previous = (await account(user)).photoPath!;
  paths.add(previous);
  response = await get(user, "/api/profile/photo");
  assert.equal(response.status, 200);
  const metadata = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.exif, undefined);
  assert.equal(
    (await get(other, `/api/profile/photo?uid=${user.localId}`)).status,
    404,
  );
  assert.equal(
    (await (await get(other, `/api/profile?uid=${user.localId}`)).json())
      .profile.values.bio,
    "",
  );
  response = await save(user, 2, {}, image);
  assert.equal(response.status, 200);
  const current = (await account(user)).photoPath!;
  paths.add(current);
  assert.notEqual(current, previous);
  assert.equal(await photoExists(previous), false);
  assert.equal((await save(user, 3, { bio: "" }, null, "remove")).status, 200);
  assert.equal(await photoExists(current), false);
  assert.equal((await get(user, "/api/profile/photo")).status, 404);
  const simultaneous = await Promise.all([
    save(user, 4, { headline: "First" }),
    save(user, 4, { headline: "Second" }),
  ]);
  assert.deepEqual(simultaneous.map((item) => item.status).sort(), [200, 409]);
  assert.equal((await account(user)).profileRevision, 5);
  console.log(
    "Profile HTTP integration passed: auth, validation, SQL persistence, ownership, photo conversion/replacement/removal, and concurrent saves.",
  );
} finally {
  if (created.length) await db.delete(users).where(inArray(users.id, created));
  for (const path of paths) await removePhoto(path);
  for (const id of created) await admin.auth.admin.deleteUser(id);
  await pool.end();
}
