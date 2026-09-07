import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
