import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { createSession, ensureAuthSchema, setSessionCookie } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

const INVALID_CREDENTIALS = "Invalid email/ID/phone or password.";

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

/** Include the underlying error text outside production, or when explicitly enabled for Plesk debugging. */
function includeErrorDetail(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NINIMED_AUTH_DEBUG === "true";
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be JSON." }, { status: 400 });
  }

  const identifier = String(body?.email ?? body?.identifier ?? "").trim();
  const password = typeof body?.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return NextResponse.json(
      { success: false, error: "Email (or National ID / phone) and password are required." },
      { status: 400 }
    );
  }

  try {
    await ensureAuthSchema();

    const [dbUser] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        role: users.role,
        department: users.department,
        licenseNumber: users.licenseNumber,
        organizationId: users.organizationId,
        isActive: users.isActive,
        isAdminGrantedBySuperAdmin: users.isAdminGrantedBySuperAdmin,
      })
      .from(users)
      .where(
        or(
          eq(users.email, identifier.toLowerCase()),
          eq(users.nationalId, identifier.toUpperCase()),
          eq(users.phone, identifier)
        )
      )
      .limit(1);

    // Same response for unknown user and wrong password: no account enumeration.
    // An account with no password set cannot sign in with a password at all.
    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const verification = await verifyPassword(password, dbUser.passwordHash);
    if (!verification.ok) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS }, { status: 401 });
    }

    if (!dbUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Account is inactive. Please contact your system administrator." },
        { status: 403 }
      );
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

    // Transparently upgrade legacy SHA-256 hashes to scrypt.
    if (verification.needsRehash) {
      try {
        await db
          .update(users)
          .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
          .where(eq(users.id, dbUser.id));
      } catch (err) {
        console.warn("[Auth] Password hash upgrade failed (login continues):", err);
      }
    }

    const token = await createSession(dbUser.id, req);

    // Shift notification for clinicians: best-effort, never blocks sign-in.
    const isClinical = ["physician", "nurse", "nurse_practitioner", "care_coordinator", "triage_staff"].includes(dbUser.role);
    if (isClinical) {
      import("@/lib/notifications/notification-service")
        .then(({ dispatchNotification }) =>
          dispatchNotification({
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
          })
        )
        .catch(() => {});
    }

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
      redirectTo: getRoleRedirectPath(dbUser.role),
      message: `Signed in successfully as ${dbUser.fullName}`,
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("[Auth] Sign-in failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sign-in is temporarily unavailable. Please try again shortly.",
        ...(includeErrorDetail() ? { detail: error?.message || String(error) } : {}),
      },
      { status: 500 }
    );
  }
}
