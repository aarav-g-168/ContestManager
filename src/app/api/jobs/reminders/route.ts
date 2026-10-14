import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runRecoveryWorker } from "@/lib/recoveryWorker";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || Buffer.byteLength(secret) < 32)
    return NextResponse.json(
      { error: "Scheduler is not configured" },
      { status: 503 },
    );
  if (
    Buffer.byteLength(token) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runRecoveryWorker(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Reminder worker unavailable" },
      { status: 503 },
    );
  }
}
