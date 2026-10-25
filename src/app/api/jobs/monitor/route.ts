import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { validJobToken } from "@/lib/security/job-token";
import { inspectHealth } from "@/features/operations/server/health";
import { sendOperationalAlert } from "@/features/operations/server/alerts";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!validJobToken(request))
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  try {
    const db = getDatabase(),
      health = await inspectHealth(db);
    let alert = {
      configured: !!process.env.OPERATIONS_ALERT_EMAIL,
      sent: false,
    };
    if (!health.ok)
      alert = await sendOperationalAlert(
        db,
        `Health signals: recovery=${health.recovery}; overdue=${health.overdue}; attention=${health.attention}; delayed deletions=${health.stuckDeletions}.`,
      );
    return NextResponse.json(
      { status: health.ok ? "ok" : "degraded", alert },
      { status: health.ok ? 200 : 503, headers },
    );
  } catch {
    try {
      await sendOperationalAlert(
        getDatabase(),
        "The operational health check could not finish.",
      );
    } catch {
      /* Independent GitHub workflow still reports failure. */
    }
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers },
    );
  }
}
