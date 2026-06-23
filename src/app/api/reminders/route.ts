import { NextResponse } from "next/server";

export async function GET() {
  console.log(
    "Reminder API called at",
    new Date().toISOString()
  );

  return NextResponse.json({
    success: true,
    source: "github_action",
    timestamp: new Date(),
  });
}