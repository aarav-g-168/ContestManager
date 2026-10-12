import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getDatabase } from "@/lib/db";
import { recordMailEvent } from "@/lib/reminderQueue";
import { readLimitedText } from "@/lib/requestBody";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET)
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload: await readLimitedText(request, 65536),
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }
  if (
    event.type.startsWith("email.") &&
    "email_id" in event.data &&
    typeof event.data.email_id === "string"
  ) {
    try {
      await recordMailEvent(getDatabase(), {
        id: request.headers.get("svix-id")!,
        providerId: event.data.email_id,
        type: event.type,
      });
    } catch {
      return NextResponse.json(
        { error: "Unable to record delivery event" },
        { status: 503 },
      );
    }
  }
  return NextResponse.json({ received: true });
}
