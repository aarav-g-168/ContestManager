import type { deliveries } from "./db/schema";
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
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function reminderEmail(delivery: Delivery) {
  const start = delivery.contestStart.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const url = new URL(delivery.href);
  if (url.protocol !== "https:")
    throw new MailError("Invalid contest URL", false);
  return {
    subject: `Reminder: ${delivery.event}`,
    text: `${delivery.event}\nStarts ${start} IST (UTC+5:30).\nYour ${delivery.reminderType} reminder.\nOpen contest: ${url.toString()}\n\nGood luck with the contest!\nAarav Gupta\nFounder, Contest Manager\nExplore my other projects: https://aarav.site\n\nYou received this because you saved a reminder in Contest Manager.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#25211e"><p style="color:#b83d16">CONTEST MANAGER</p><h1 style="font-size:24px">${escapeHtml(delivery.event)}</h1><p>Starts <strong>${escapeHtml(start)} IST (UTC+5:30)</strong>.</p><p>You requested a ${escapeHtml(delivery.reminderType)} reminder.</p><p><a style="color:#b83d16" href="${escapeHtml(url.toString())}">Open contest →</a></p><div style="margin-top:32px;font-size:14px;line-height:1.6"><p style="margin:0 0 12px">Good luck with the contest!</p><p style="margin:0"><strong>Aarav Gupta</strong><br>Founder, Contest Manager</p><p style="margin:8px 0 24px"><a style="color:#b83d16;text-decoration:underline" href="https://aarav.site">Explore my other projects</a></p></div><hr><p style="font-size:12px">You received this because you saved a reminder in Contest Manager.</p></div>`,
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
