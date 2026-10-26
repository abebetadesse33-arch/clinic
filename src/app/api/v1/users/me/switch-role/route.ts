import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, isAdminUser } from "@/lib/security/auth-session";
import { db } from "@/db";
import { userRoles } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { role } = body as { role: string };

    if (!role) {
      return NextResponse.json({ success: false, error: "role is required" }, { status: 400 });
    }

    // In production: validate against user_roles table and update session
    // Here we accept any valid role string
    const VALID_ROLES = [
      "physician", "nurse_practitioner", "nurse", "pharmacist",
      "physiotherapist", "occupational_therapist", "dietitian",
      "social_worker", "radiologist", "pathologist", "lab_technician",
      "genetic_counselor", "respiratory_therapist", "psychologist",
      "biologist", "care_coordinator", "patient", "tenant_admin",
      "system_admin", "auditor",
    ];

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role: ${role}` },
        { status: 400 }
      );
    }

    // A user may only switch to a role they actually hold; administrators may preview any role.
    let holdsRole = role === auth.user.role || isAdminUser(auth.user);
    if (!holdsRole) {
      const [granted] = await db
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(and(eq(userRoles.userId, auth.user.id), eq(userRoles.role, role), eq(userRoles.isActive, true)))
        .limit(1);
      holdsRole = Boolean(granted);
    }
    if (!holdsRole) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you do not hold this role." },
        { status: 403 }
      );
    }

    // Build 21 CFR Part 11 audit entry
    const auditEntry = {
      action: "ROLE_SWITCH",
      entityType: "user_session",
      entityId: "session-current",
      userRole: role,
      ipAddress: request.headers.get("x-forwarded-for") ?? "127.0.0.1",
      timestamp: new Date().toISOString(),
      signature: `ROLE-SWITCH-${role.toUpperCase()}-${Date.now()}`,
    };

    return NextResponse.json({
      success: true,
      data: {
        activeRole: role,
        switchedAt: new Date().toISOString(),
        auditRef: auditEntry.signature,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
