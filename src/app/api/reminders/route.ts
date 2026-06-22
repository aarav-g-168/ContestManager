import { NextResponse } from "next/server";

export async function GET() {
  console.log("Reminder API called");

  return NextResponse.json({
    success: true,
    source: "github-action",
    timestamp: new Date(),
  });
}