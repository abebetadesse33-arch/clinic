import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qrLoginSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/qr-login/authorize
 * Authenticated device approves login on the target device displaying the QR code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionChallenge } = body;

    if (!sessionChallenge) {
      return NextResponse.json(
        { success: false, error: "Session challenge is required." },
        { status: 400 }
      );
    }

    // 1. The approving identity comes only from this device's verified session.
    const auth = await requireAuthenticatedUser(req);
    if ("response" in auth) {
      return NextResponse.json(
        { success: false, error: "You must be signed in on this device to authorize a QR login." },
        { status: 401 }
      );
    }
    const user = auth.user;

    // 2. Fetch target QR session
    const [session] = await db
      .select()
      .from(qrLoginSessions)
      .where(eq(qrLoginSessions.sessionChallenge, sessionChallenge))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Invalid QR login session challenge." },
        { status: 404 }
      );
    }

    if (session.status === "consumed" || session.status === "authorized") {
      return NextResponse.json(
        { success: false, error: "This QR login challenge has already been used." },
        { status: 409 }
      );
    }

    if (new Date(session.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: "QR login session expired. Please refresh the QR code on the other device." },
        { status: 410 }
      );
    }

    // 3. Authorize session
    await db
      .update(qrLoginSessions)
      .set({
        status: "authorized",
        authenticatedUserId: user.id,
        authorizedAt: new Date(),
      })
      .where(eq(qrLoginSessions.id, session.id));

    return NextResponse.json({
      success: true,
      message: `Login authorized for ${user.fullName} on the requested device.`,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Error authorizing QR login:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to authorize QR login." },
      { status: 500 }
    );
  }
}
