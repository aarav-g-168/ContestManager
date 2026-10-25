import { getDatabase } from "@/lib/db";
import {
  authenticateProfile,
  profileErrorResponse,
  ProfileRequestError,
} from "@/lib/http/account-request";
import { takeRequestLimit } from "@/lib/security/rate-limit";
import { exportAccount, journalCsv } from "@/features/account/server/export";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ownedAvatarPath } from "@/features/profile/server/profile";
import { downloadPhoto } from "@/features/profile/server/storage";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request),
      db = getDatabase();
    await takeRequestLimit(db, user.uid, "export", 5, 3600);
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (format === "photo") {
      const [row] = await db
        .select({ path: users.photoPath })
        .from(users)
        .where(eq(users.id, user.uid));
      if (!ownedAvatarPath(row?.path, user.uid))
        throw new ProfileRequestError(
          "No uploaded profile photo is available.",
          404,
        );
      return new Response(new Uint8Array(await downloadPhoto(row.path)), {
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition":
            "attachment; filename=contest-manager-profile.webp",
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
        },
      });
    }
    if (!["json", "csv"].includes(format))
      throw new ProfileRequestError("Choose JSON or CSV export.", 400);
    const value = await exportAccount(db, user.uid);
    return new Response(
      format === "csv"
        ? journalCsv(value.journal)
        : JSON.stringify(value, null, 2),
      {
        headers: {
          "Content-Type":
            format === "csv"
              ? "text/csv; charset=utf-8"
              : "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="contest-manager-${format === "csv" ? "journal" : "account"}.${format}"`,
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (e) {
    return profileErrorResponse(e);
  }
}
