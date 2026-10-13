import assert from "node:assert/strict";
import { checkPhotoStorage, uploadPhoto, downloadPhoto, removePhoto } from "../src/lib/photoStorage";

// Isolated transport tests: no real storage account or credentials are used.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://photo-test.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
process.env.SUPABASE_PHOTO_BUCKET = "profile-photos";
const originalFetch = globalThis.fetch;
let publicBucket = false;
let rejectRequest = false;
const photo = Buffer.from("test-image-bytes");
const path = "profile-photos/test-user/abc.webp";
globalThis.fetch = async (input, init) => {
  const url = String(input);
  const headers = new Headers(init?.headers);
  assert.equal(headers.get("apikey"), "sb_secret_test_only");
  assert.ok(!url.includes("sb_secret_test_only"));
  if (rejectRequest) return Response.json({ message: "Denied", statusCode: "403" }, { status: 403 });
  if (url.endsWith("/bucket/profile-photos"))
    return Response.json({ id: "profile-photos", name: "profile-photos", public: publicBucket });
  if (init?.method === "POST") {
    assert.ok(url.endsWith(`/object/profile-photos/${path}`));
    assert.equal(headers.get("content-type"), "image/webp");
    assert.deepEqual(Buffer.from(init.body as Uint8Array), photo);
    return Response.json({ Key: path });
  }
  if (init?.method === "DELETE") {
    assert.deepEqual(JSON.parse(String(init.body)), { prefixes: [path] });
    return Response.json([]);
  }
  assert.ok(url.includes(`/object/`));
  assert.ok(!url.includes("/public/"));
  return new Response(photo, { headers: { "Content-Type": "image/webp" } });
};
try {
  await checkPhotoStorage();
  publicBucket = true;
  await assert.rejects(checkPhotoStorage, /private/);
  publicBucket = false;
  await uploadPhoto(path, photo);
  assert.deepEqual(await downloadPhoto(path), photo);
  await removePhoto(path);
  rejectRequest = true;
  await assert.rejects(() => uploadPhoto(path, photo), /upload failed/);
  await assert.rejects(() => downloadPhoto(path), /download failed/);
  await assert.rejects(() => removePhoto(path), /deletion failed/);
  await assert.rejects(checkPhotoStorage, /unavailable/);
  delete process.env.SUPABASE_SECRET_KEY;
  await assert.rejects(checkPhotoStorage, /Configure/);
  console.log("Photo storage tests passed: private bucket, authenticated upload/read/delete, provider failures, missing configuration.");
} finally {
  globalThis.fetch = originalFetch;
}
