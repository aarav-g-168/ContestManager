// Integration checks against isolated Firebase emulators. Never targets live Firebase.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const origin = process.env.PROFILE_TEST_ORIGIN || "http://127.0.0.1:3001";
assert.equal(
  new URL(origin).hostname,
  "127.0.0.1",
  "Use the local test preview.",
);
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
const app = initializeApp({
  projectId: "demo-contest-manager",
  storageBucket: "demo-contest-manager.appspot.com",
});
const db = getFirestore(app);
const bucket = getStorage(app).bucket();
const values = {
  displayName: "Profile Tester",
  headline: "Computer science student",
  bio: "I enjoy graph problems and building small tools.",
  location: "Pune, India",
  organization: "Example University",
  website: "example.com",
  github: "github.com/profile-tester",
  linkedin: "linkedin.com/in/profile-tester",
  x: "x.com/profile_tester",
  codeforces: "profile_tester",
  leetcode: "profile_tester",
  atcoder: "profile_tester",
  codechef: "",
};
async function newUser() {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  assert.equal(response.status, 200, "Auth emulator must be running.");
  return response.json();
}
function get(user, path = "/api/profile") {
  return fetch(`${origin}${path}`, {
    headers: { Authorization: `Bearer ${user.idToken}` },
  });
}
function save(user, revision, edits = {}, photo = null, action = "keep") {
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
try {
  assert.equal((await fetch(`${origin}/api/profile`)).status, 401);
  assert.equal((await get({ idToken: "invalid" })).status, 401);
  const [user, other] = await Promise.all([newUser(), newUser()]);
  const reference = db.collection("users").doc(user.localId);
  await reference.set({
    displayName: "Google Name",
    email: "fixture@example.test",
  });
  assert.equal((await get(user, "/api/profile/photo")).status, 404);
  let response = await save(user, 0);
  assert.equal(response.status, 200, await response.clone().text());
  let result = await response.json();
  assert.equal(result.profile.revision, 1);
  assert.equal(result.profile.values.website, "https://example.com/");
  assert.equal((await (await get(user)).json()).profile.values.bio, values.bio);
  assert.equal((await reference.get()).data().displayName, "Google Name");
  for (const edits of [
    { displayName: "" },
    { bio: "x".repeat(301) },
    { website: "javascript:alert(1)" },
    { github: "https://github.com.evil.test/user" },
  ]) {
    assert.equal((await save(user, 1, edits)).status, 400);
  }
  assert.equal((await save(user, 0)).status, 409);
  assert.equal(
    (await save(user, 1, {}, new Blob(["not an image"], { type: "image/png" })))
      .status,
    400,
  );
  const image = new Blob(
    [await readFile(new URL("../public/coding.png", import.meta.url))],
    { type: "image/png" },
  );
  response = await save(user, 1, {}, image);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).profile.avatarMode, "custom");
  const previous = (await reference.get()).data().profile;
  response = await get(user, "/api/profile/photo");
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get("content-type"), "image/webp");
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
  assert.equal(response.status, 200, await response.clone().text());
  const current = (await reference.get()).data().profile;
  assert.notEqual(previous.photoPath, current.photoPath);
  if (previous.photoStore === "firestore") {
    assert.equal(
      (
        await reference
          .collection("profilePhotos")
          .doc(
            previous.photoPath
              .split("/")
              .at(-1)
              .replace(/\.webp$/, ""),
          )
          .get()
      ).exists,
      false,
    );
  } else {
    assert.equal((await bucket.file(previous.photoPath).exists())[0], false);
  }
  assert.equal((await save(user, 3, { bio: "" }, null, "remove")).status, 200);
  assert.equal((await get(user, "/api/profile/photo")).status, 404);
  const simultaneous = await Promise.all([
    save(user, 4, { headline: "First edit" }),
    save(user, 4, { headline: "Second edit" }),
  ]);
  assert.deepEqual(simultaneous.map((item) => item.status).sort(), [200, 409]);
  assert.equal((await (await get(user)).json()).profile.revision, 5);
  console.log(
    `Profile integration checks passed (${current.photoStore} photos): authentication, persistence, validation, image conversion, isolation, replacement/removal, and concurrent saves.`,
  );
} finally {
  await deleteApp(app);
}
