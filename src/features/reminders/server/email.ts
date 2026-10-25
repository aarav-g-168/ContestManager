import type { deliveries } from "@/lib/db/schema";
import { getPlatform } from "@/features/contests/lib/platforms";
import { renderReminderEmail } from "@/features/reminders/server/email-template";
export { escapeHtml } from "@/features/reminders/server/email-template";
export type Delivery = typeof deliveries.$inferSelect;
export class MailError extends Error {
  constructor(
    message: string,
    public retryable = true,
  ) {
    super(message);
  }
}
export interface MailProvider {
  schedule(delivery: Delivery): Promise<string>;
  cancel(id: string): Promise<"cancelled" | "sent" | "delivered" | "bounced">;
}
export function assertMailConfigured() {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM ||
    /@resend\.dev\b/i.test(process.env.RESEND_FROM)
  )
    throw new MailError(
      "A verified reminder email sender is not configured.",
      false,
    );
}
export function reminderEmail(delivery: Delivery) {
  const date = delivery.contestStart.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = delivery.contestStart
    .toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .toUpperCase();
  let url: URL;
  try {
    url = new URL(delivery.href);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
  } catch {
    throw new MailError("Invalid contest URL", false);
  }
  let appUrl = new URL("https://contest-manager.vercel.app");
  try {
    const configured = new URL(process.env.APP_URL ?? "");
    if (
      configured.protocol === "https:" &&
      !configured.username &&
      !configured.password
    )
      appUrl = configured;
  } catch {
    /* Public production URL is the fallback for missing/invalid configuration. */
  }
  const weekUrl = new URL("/week", appUrl).toString();
  const remindersUrl = new URL("/reminders", appUrl).toString();
  const platform = getPlatform(url.hostname).name;
  const reminderLabel =
    (
      {
        "1h": "1-hour reminder",
        "6h": "6-hour reminder",
        "24h": "24-hour reminder",
      } as Record<string, string>
    )[delivery.reminderType] ?? "contest reminder";
  return {
    subject: `Reminder: ${delivery.event}`,
    text: `CONTEST MANAGER\nYour contest starts soon.\n\n${delivery.event}\nPlatform: ${platform}\nDate: ${date}\nStart time: ${time} IST (UTC+5:30)\nYour saved ${reminderLabel}.\n\nOpen contest: ${url.toString()}\nMy week: ${weekUrl}\nManage reminders: ${remindersUrl}\n\nGood luck with the round,\nAarav Gupta\nFounder, Contest Manager\nExplore my other projects: https://aarav.site\n\nYou received this because you saved a contest reminder in Contest Manager. You can change or remove future reminders from your account.`,
    html: renderReminderEmail({
      event: delivery.event,
      platform,
      date,
      time,
      reminderLabel,
      contestUrl: url.toString(),
      weekUrl,
      remindersUrl,
    }),
  };
}
export function resendPayload(delivery: Delivery) {
  return {
    from: process.env.RESEND_FROM,
    to: [delivery.email],
    ...reminderEmail(delivery),
    ...(delivery.requestScheduledAt
      ? { scheduled_at: delivery.requestScheduledAt.toISOString() }
      : {}),
    tags: [{ name: "delivery_id", value: delivery.id }],
  };
}
async function resendRequest(
  path: string,
  method: string,
  body?: unknown,
  idempotencyKey?: string,
) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new MailError(
      `resend:${response.status}:${String(data.name ?? "request_failed")}`,
      response.status === 409 ||
        response.status === 429 ||
        response.status >= 500,
    );
  return data;
}
export const resendProvider: MailProvider = {
  async schedule(delivery) {
    assertMailConfigured();
    const data = await resendRequest(
      "/emails",
      "POST",
      delivery.providerPayload ?? resendPayload(delivery),
      `reminder/${delivery.id}`,
    );
    if (typeof data.id !== "string")
      throw new MailError("Resend did not confirm an email ID");
    return data.id;
  },
  async cancel(id) {
    try {
      await resendRequest(`/emails/${encodeURIComponent(id)}/cancel`, "POST");
      return "cancelled";
    } catch (error) {
      if (!(error instanceof MailError) || error.retryable) throw error;
      const data = await resendRequest(
        `/emails/${encodeURIComponent(id)}`,
        "GET",
      );
      if (data.last_event === "canceled" || data.last_event === "cancelled")
        return "cancelled";
      if (data.last_event === "failed" || data.last_event === "suppressed")
        return "cancelled";
      if (
        data.last_event === "sent" ||
        data.last_event === "delivered" ||
        data.last_event === "bounced"
      )
        return data.last_event;
      throw error;
    }
  },
};
