import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telemedicineSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── GET /api/v1/telemedicine/sessions ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  try {
    const sessions = await db
      .select()
      .from(telemedicineSessions)
      .where(eq(telemedicineSessions.tenantId, tenantId))
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
  try {
    const body = await req.json();
    const {
      tenantId,
      patientId,
      doctorId,
      clinicianId,
      encounterId,
      scheduledAt,
    } = body;

    const resolvedDoctorId = doctorId || clinicianId;

    if (!tenantId || !patientId || !resolvedDoctorId || !encounterId) {
      return NextResponse.json(
        { error: "tenantId, patientId, doctorId (or clinicianId), and encounterId are required" },
        { status: 400 }
      );
    }

    const roomId = `room-${tenantId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const [session] = await db
      .insert(telemedicineSessions)
      .values({
        tenantId,
        encounterId,
        patientId,
        doctorId: resolvedDoctorId,
        roomId,
        status: "scheduled",
        startedAt: scheduledAt ? new Date(scheduledAt) : null,
      })
      .returning();

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
