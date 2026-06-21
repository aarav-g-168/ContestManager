import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const usersSnapshot =
      await adminDb.collection("users").get();

    return NextResponse.json({
      success: true,
      users: usersSnapshot.size,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}