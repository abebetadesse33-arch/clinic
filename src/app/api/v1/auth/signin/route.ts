import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function getRoleRedirectPath(role: string): string {
  switch (role) {
    case "patient":
      return "/patient/dashboard";
    case "system_admin":
    case "tenant_admin":
      return "/admin";
    case "pharmacist":
      return "/pharmacy";
    case "dietitian":
      return "/nutrition";
    case "physiotherapist":
    case "occupational_therapist":
      return "/physiotherapy";
    case "psychologist":
      return "/psychologist";
    case "social_worker":
      return "/social-work";
    case "biologist":
      return "/biologist";
    case "auditor":
      return "/audit";
    case "physician":
    case "nurse_practitioner":
    case "nurse":
    case "care_coordinator":
    default:
      return "/";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const identifier = String(email || body.identifier || "").trim();
    const normalizedIdentifier = identifier.toLowerCase();
    const cleanNationalId = identifier.toUpperCase();

    const [dbUser] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, normalizedIdentifier),
          eq(users.nationalId, cleanNationalId),
          eq(users.phone, identifier)
        )
      )
      .limit(1);

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "No account found matching this Email, National ID, or Phone." },
        { status: 401 }
      );
    }

    if (!dbUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Account is inactive. Please contact your system administrator." },
        { status: 403 }
      );
    }

    if (dbUser.passwordHash) {
      const inputHash = sha256Hex(password);
      if (inputHash !== dbUser.passwordHash && password !== dbUser.passwordHash) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password." },
          { status: 401 }
        );
      }
    }

    if (dbUser.role === "tenant_admin" && !dbUser.isAdminGrantedBySuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "This admin role is restricted. Please contact the system super admin to grant access.",
        },
        { status: 403 }
      );
    }

    const redirectTo = getRoleRedirectPath(dbUser.role);

    try {
      const { dispatchNotification } = await import("@/lib/notifications/notification-service");
      const isClinical = ["physician", "nurse", "nurse_practitioner", "care_coordinator", "triage_staff"].includes(dbUser.role);
      if (isClinical) {
        await dispatchNotification({
          category: "auth_shifts",
          type: "clinician_signed_in",
          title: `🟢 ${dbUser.fullName} Signed In`,
          body: `${dbUser.fullName} (${dbUser.role.replace(/_/g, " ")}, ${dbUser.department || "General"}) has started their shift at ${new Date().toLocaleTimeString()}.`,
          priority: "low",
          targetRole: "system_admin",
          senderUserId: dbUser.id,
          actionUrl: "/admin",
          actionText: "View Staff Directory",
          relatedEntityType: "users",
          relatedEntityId: dbUser.id,
          metadata: { role: dbUser.role, department: dbUser.department },
        });
      }
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        fullName: dbUser.fullName,
        email: dbUser.email,
        role: dbUser.role,
        licenseNumber: dbUser.licenseNumber,
        department: dbUser.department,
        organizationId: dbUser.organizationId,
        isAdminGrantedBySuperAdmin: Boolean(dbUser.isAdminGrantedBySuperAdmin),
      },
      redirectTo,
      token: `token_${dbUser.id}_${Date.now()}`,
      message: `Signed in successfully as ${dbUser.fullName}`,
    });

    response.cookies.set("Nini_session", dbUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Authentication sign-in error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
