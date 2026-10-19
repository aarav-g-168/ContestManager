import { eq } from "drizzle-orm";
import type { VerifiedAccount } from "@/features/auth/server/auth";
import { getDatabase } from "@/lib/db";
import { users } from "@/lib/db/schema";
export async function ensureAccount(token: VerifiedAccount) {
  const db = getDatabase();
  await db
    .insert(users)
    .values({
      id: token.uid,
      email: token.email ?? null,
      name: token.name ?? null,
      googlePhotoUrl: token.picture ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: token.email ?? null,
        name: token.name ?? null,
        googlePhotoUrl: token.picture ?? null,
      },
    });
  return (await db.select().from(users).where(eq(users.id, token.uid)))[0];
}
