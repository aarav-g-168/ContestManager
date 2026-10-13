// Read-only source export; private files remain in the gitignored backup directory.
import { config } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from "firebase-admin/firestore";
config({ path: ".migration-backups/legacy.env", quiet: true });
const { adminAuth } = await import("./legacyFirebase.mts");
const source = getFirestore(adminAuth.app);
function encode(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return { type: "bytes", base64: value.toString("base64") };
  if (value instanceof Timestamp) return { type: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof GeoPoint) return { type: "geopoint", latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return { type: "reference", path: value.path };
  if (value instanceof Date) return { type: "date", iso: value.toISOString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, encode(item)]));
  return value;
}
const records: { path: string; data: unknown }[] = [];
async function capture(reference: DocumentReference) {
  const document = await reference.get();
  if (document.exists) records.push({ path: reference.path, data: encode(document.data()) });
  for (const collection of await reference.listCollections())
    for (const child of await collection.listDocuments()) await capture(child);
}
const accounts = [];
for (const reference of await source.collection("users").listDocuments()) {
  await capture(reference);
  const user = await adminAuth.getUser(reference.id);
  accounts.push({ id: user.uid, email: user.email ?? null, emailVerified: user.emailVerified, disabled: user.disabled, providerData: user.providerData });
}
records.sort((a, b) => a.path.localeCompare(b.path));
const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), scope: "users and all descendant documents; Google identity metadata", accounts, records });
const hash = createHash("sha256").update(payload).digest("hex");
const path = `.migration-backups/firestore-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await mkdir(".migration-backups", { recursive: true });
await writeFile(path, payload, { flag: "wx" });
if (createHash("sha256").update(await readFile(path)).digest("hex") !== hash) throw new Error("Backup verification failed");
await writeFile(`${path}.sha256`, hash + "\n", { flag: "wx" });
console.log(JSON.stringify({ backup: path, accounts: accounts.length, documents: records.length, verified: true, sourceUnchanged: true }));
