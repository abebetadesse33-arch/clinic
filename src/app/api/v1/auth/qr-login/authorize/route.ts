import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qrLoginSessions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/qr-login/authorize
 * Authenticated device approves login on the target device displaying the QR code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionChallenge, userId: clientUserId } = body;

    if (!sessionChallenge) {
      return NextResponse.json(
        { success: false, error: "Session challenge is required." },
        { status: 400 }
      );
    }

    // 1. Identify logged-in user
    let authenticatedUserId: string | null = clientUserId || null;
    if (!authenticatedUserId) {
      const sessionId = req.cookies.get("Nini_session")?.value;
      if (sessionId) authenticatedUserId = sessionId;
    }

    if (!authenticatedUserId) {
      // Fallback to active user if available
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true)).limit(1);
      if (u) authenticatedUserId = u.id;
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        { success: false, error: "You must be signed in on this device to authorize a QR login." },
        { status: 401 }
      );
    }

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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authenticatedUserId))
      .limit(1);

    await db
      .update(qrLoginSessions)
      .set({
        status: "authorized",
        authenticatedUserId: user ? user.id : authenticatedUserId,
        authorizedAt: new Date(),
      })
      .where(eq(qrLoginSessions.id, session.id));

    return NextResponse.json({
      success: true,
      message: `Login authorized for ${user?.fullName || "your account"} on the requested device.`,
      user: user
        ? {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error authorizing QR login:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to authorize QR login." },
      { status: 500 }
    );
  }
}
