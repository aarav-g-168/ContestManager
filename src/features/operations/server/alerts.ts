import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { operationalAlerts } from "@/lib/db/schema";
export type AlertSender = (subject: string, text: string) => Promise<void>;
const send: AlertSender = async (subject, text) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: [process.env.OPERATIONS_ALERT_EMAIL],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Alert provider unavailable");
};
export async function sendOperationalAlert(
  db: Database,
  text: string,
  sender: AlertSender = send,
  now = new Date(),
) {
  if (
    sender === send &&
    (!process.env.OPERATIONS_ALERT_EMAIL ||
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM)
  )
    return { configured: false, sent: false };
  const key = "launch-health",
    [claim] = await db
      .insert(operationalAlerts)
      .values({ key, lastAttemptAt: now })
      .onConflictDoUpdate({
        target: operationalAlerts.key,
        set: { lastAttemptAt: now },
        setWhere: sql`${operationalAlerts.lastAttemptAt} < ${new Date(now.getTime() - 6 * 3600000)}`,
      })
      .returning();
  if (!claim) return { configured: true, sent: false };
  await sender(
    "Contest Manager needs attention",
    text +
      "\nOpen the private admin dashboard to investigate. No user data is included in this alert.",
  );
  await db
    .update(operationalAlerts)
    .set({ lastSuccessAt: now })
    .where(eq(operationalAlerts.key, key));
  return { configured: true, sent: true };
}
