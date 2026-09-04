import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qrLoginSessions } from "@/db/schema";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/qr-login/create
 * Creates a unique 2-minute QR login session challenge for a secondary device or kiosk.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionChallenge = `qr_sess_${randomBytes(18).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const deviceInfo = req.headers.get("user-agent") || "Secondary Web Browser / Clinic Terminal";

    const [session] = await db
      .insert(qrLoginSessions)
      .values({
        sessionChallenge,
        status: "pending",
        deviceInfo,
        ipAddress,
        expiresAt,
      })
      .returning();

    // Construct QR code payload with challenge token
    const qrPayload = JSON.stringify({
      type: "NINIMED_QR_LOGIN",
      challenge: sessionChallenge,
      expiresAt: expiresAt.toISOString(),
      server: "https://app.ninimed.org",
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionChallenge,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: 120,
        qrPayload,
      },
      message: "QR login session generated. Scan with your active NiniMed mobile app to sign in instantly.",
    });
  } catch (error: any) {
    console.error("Error creating QR login session:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create QR login challenge." },
      { status: 500 }
    );
  }
}
