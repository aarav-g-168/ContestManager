import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { inspectHealth } from "@/features/operations/server/health";
export const runtime = "nodejs";
export async function GET() {
  const headers = {
    "Cache-Control": "public, max-age=0, s-maxage=30",
    "X-Robots-Tag": "noindex",
  };
  try {
    const health = await inspectHealth(getDatabase());
    return NextResponse.json(
      {
        status: health.ok ? "ok" : "degraded",
        database: "reachable",
        recovery: health.recovery ? "recent" : "needs-attention",
      },
      { status: health.ok ? 200 : 503, headers },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers },
    );
  }
}
