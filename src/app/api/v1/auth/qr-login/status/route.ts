import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qrLoginSessions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSession, setSessionCookie } from "@/lib/security/auth-session";
import { updateReturning } from "@/lib/db/returning";

export const dynamic = "force-dynamic";

function getRoleRedirectPath(role: string): string {
  switch (role) {
    case "patient":
      return "/patient/dashboard";
    case "pharmacist":
      return "/pharmacy";
    case "biologist":
    case "pathologist":
    case "lab_technician":
      return "/biologist";
    case "system_admin":
    case "tenant_admin":
      return "/admin";
    case "physician":
    case "nurse":
    case "care_coordinator":
      return "/";
    default:
      return "/";
  }
}

/**
 * GET /api/v1/auth/qr-login/status?challenge=...
 * Checks if the QR code has been scanned and authorized by the user's primary mobile device.
 */
export async function GET(req: NextRequest) {
  try {
    const challenge = req.nextUrl.searchParams.get("challenge");

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge parameter is required." },
        { status: 400 }
      );
    }

    const [session] = await db
      .select()
      .from(qrLoginSessions)
      .where(eq(qrLoginSessions.sessionChallenge, challenge))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found." },
        { status: 404 }
      );
    }

    if (new Date(session.expiresAt) < new Date() && session.status === "pending") {
      return NextResponse.json({
        success: true,
        status: "expired",
        message: "QR code expired. Please generate a new QR login code.",
      });
    }

    if (session.status === "pending") {
      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Waiting for QR scan and approval...",
      });
    }

    if (session.status === "authorized" && session.authenticatedUserId) {
      // Fetch authenticated user
      const [user] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          licenseNumber: users.licenseNumber,
          department: users.department,
          organizationId: users.organizationId,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, session.authenticatedUserId))
        .limit(1);

      if (!user || !user.isActive) {
        return NextResponse.json(
          { success: false, error: "Authenticated user not found." },
          { status: 404 }
        );
      }

      // Mark session as consumed. The conditional update guarantees a challenge
      // can only ever be exchanged for a session once, even under concurrent polls.
      const consumed = await updateReturning(db, qrLoginSessions, { status: "consumed" }, and(eq(qrLoginSessions.id, session.id), eq(qrLoginSessions.status, "authorized")));

      if (consumed.length === 0) {
        return NextResponse.json(
          { success: false, error: "This QR login challenge has already been used." },
          { status: 409 }
        );
      }

      const redirectTo = getRoleRedirectPath(user.role);

      const response = NextResponse.json({
        success: true,
        status: "authorized",
        authorized: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          licenseNumber: user.licenseNumber,
          department: user.department,
          organizationId: user.organizationId,
        },
        redirectTo,
        message: `Welcome, ${user.fullName}! Login authorized via QR scan.`,
      });

      // Issue a real server-side session for this device
      setSessionCookie(response, await createSession(user.id, req));

      return response;
    }

    return NextResponse.json({
      success: true,
      status: session.status,
    });
  } catch (error: any) {
    console.error("Error checking QR login status:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to check QR login status." },
      { status: 500 }
    );
  }
}
