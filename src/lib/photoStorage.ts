import { createClient } from "@supabase/supabase-js";

// Server-only credentials. Supabase handles authentication, PostgreSQL, and private photos.
export function photoStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_PHOTO_BUCKET || "profile-photos";
  if (!url || !key) throw new Error("Configure Supabase photo storage");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  return { client, bucket, files: client.storage.from(bucket) };
}

export async function checkPhotoStorage() {
  const { client, bucket } = photoStorage();
  const { data, error } = await client.storage.getBucket(bucket);
  if (error || !data) throw new Error("Photo bucket unavailable");
  if (data.public) throw new Error("Photo bucket must be private");
}

export async function uploadPhoto(path: string, image: Buffer) {
  const { error } = await photoStorage().files.upload(path, image, {
    contentType: "image/webp", cacheControl: "300", upsert: true,
  });
  if (error) throw new Error("Photo upload failed");
}

export async function downloadPhoto(path: string): Promise<Buffer> {
  const { data, error } = await photoStorage().files.download(path);
  if (error || !data) throw new Error("Photo download failed");
  return Buffer.from(await data.arrayBuffer());
}

export async function removePhoto(path: string) {
  const { error } = await photoStorage().files.remove([path]);
  if (error) throw new Error("Photo deletion failed");
}
