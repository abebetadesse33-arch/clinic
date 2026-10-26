import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telemedicineSessions, encounters, patients } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { insertReturning } from "@/lib/db/returning";
import { requireAuthenticatedUser, requireRoles, resolveAuthorizedPatient, CLINICIAN_ROLES } from "@/lib/security/auth-session";

// ─── GET /api/v1/telemedicine/sessions ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  let patientId = searchParams.get("patientId");
  const status = searchParams.get("status");

  try {
    // Patients only ever see their own sessions.
    if (auth.user.role === "patient") {
      const access = await resolveAuthorizedPatient(req, patientId);
      if ("response" in access) return access.response;
      patientId = access.patient.id;
    }

    const sessions = await db
      .select()
      .from(telemedicineSessions)
      .where(eq(telemedicineSessions.tenantId, auth.user.organizationId))
      .orderBy(desc(telemedicineSessions.createdAt))
      .limit(50);

    const filtered = sessions.filter((s) => {
      if (patientId && s.patientId !== patientId) return false;
      if (status && s.status !== status) return false;
      return true;
    });

    return NextResponse.json({ sessions: filtered, total: filtered.length });
  } catch (error) {
    console.error("GET telemedicine sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// ─── POST /api/v1/telemedicine/sessions ──────────────────────────────────────
// Note: telemedicineSessions requires encounterId and doctorId.
// For scheduled sessions without an encounter yet, a temp encounter must be pre-created.
export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { patientId, doctorId, clinicianId, encounterId, scheduledAt } = body;
    const tenantId = auth.user.organizationId;

    const resolvedDoctorId = doctorId || clinicianId || auth.user.id;

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { error: "patientId and encounterId are required" },
        { status: 400 }
      );
    }

    // The patient and encounter must both belong to the caller's organization.
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
      .limit(1);
    const [encounter] = await db
      .select({ id: encounters.id })
      .from(encounters)
      .where(and(eq(encounters.id, encounterId), eq(encounters.tenantId, tenantId)))
      .limit(1);
    if (!patient || !encounter) {
      return NextResponse.json({ error: "Patient or encounter not found in your organization" }, { status: 404 });
    }

    const roomId = `room-${tenantId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const [session] = await insertReturning(db, telemedicineSessions, {
        tenantId,
        encounterId,
        patientId,
        doctorId: resolvedDoctorId,
        roomId,
        status: "scheduled",
        startedAt: scheduledAt ? new Date(scheduledAt) : null,
      });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const clinicianUrl = `${baseUrl}/telemedicine/${session.roomId}?role=clinician&sessionId=${session.id}`;
    const patientUrl = `${baseUrl}/telemedicine/${session.roomId}?role=patient&sessionId=${session.id}`;

    return NextResponse.json({
      session,
      joinUrls: { clinician: clinicianUrl, patient: patientUrl },
    });
  } catch (error) {
    console.error("POST telemedicine session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
