import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalRounds, patients, users, organizations } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/clinical/rounds — query ward round notes, vital summaries & critical alerts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const wardDepartment = searchParams.get("wardDepartment");
    const acuityScore = searchParams.get("acuityScore");
    const patientId = searchParams.get("patientId");

    const rounds = await db
      .select({
        id: clinicalRounds.id,
        tenantId: clinicalRounds.tenantId,
        patientId: clinicalRounds.patientId,
        encounterId: clinicalRounds.encounterId,
        bedNumber: clinicalRounds.bedNumber,
        wardDepartment: clinicalRounds.wardDepartment,
        roundingClinicianId: clinicalRounds.roundingClinicianId,
        acuityScore: clinicalRounds.acuityScore,
        vitalSummary: clinicalRounds.vitalSummary,
        clinicalNotes: clinicalRounds.clinicalNotes,
        activeConcerns: clinicalRounds.activeConcerns,
        planOfCare: clinicalRounds.planOfCare,
        criticalAlerts: clinicalRounds.criticalAlerts,
        acknowledgedBy: clinicalRounds.acknowledgedBy,
        acknowledgedAt: clinicalRounds.acknowledgedAt,
        isEscalated: clinicalRounds.isEscalated,
        nextRoundScheduledAt: clinicalRounds.nextRoundScheduledAt,
        createdAt: clinicalRounds.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        patientDateOfBirth: patients.dateOfBirth,
        patientGender: patients.gender,
        patientBloodType: patients.bloodType,
      })
      .from(clinicalRounds)
      .innerJoin(patients, eq(clinicalRounds.patientId, patients.id))
      .orderBy(desc(clinicalRounds.createdAt));

    let filtered = rounds;
    if (wardDepartment) filtered = filtered.filter((r) => r.wardDepartment === wardDepartment);
    if (acuityScore) filtered = filtered.filter((r) => r.acuityScore === acuityScore);
    if (patientId) filtered = filtered.filter((r) => r.patientId === patientId);

    // Critical Alerts List
    const criticalPatients = filtered.filter((r) => r.acuityScore === "critical" || r.isEscalated || ((r.criticalAlerts as any[])?.length > 0));

    return NextResponse.json({
      success: true,
      data: {
        rounds: filtered,
        criticalAlertsCount: criticalPatients.length,
        criticalPatients,
        totalInpatients: filtered.length,
      },
    });
  } catch (error: any) {
    console.error("[CLINICAL ROUNDS GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/clinical/rounds — record round assessment or execute rapid action
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      patientId,
      encounterId,
      bedNumber,
      wardDepartment = "General Inpatient",
      roundingClinicianId,
      acuityScore = "stable",
      vitalSummary = {},
      clinicalNotes,
      activeConcerns,
      planOfCare,
      criticalAlerts = [],
      isEscalated = false,
      nextRoundScheduledAt,
    } = body;

    if (!patientId || !bedNumber || !clinicalNotes || !planOfCare) {
      return NextResponse.json({
        success: false,
        error: "patientId, bedNumber, clinicalNotes, and planOfCare are required.",
      }, { status: 400 });
    }

    // Resolve tenant ID fallback
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      resolvedTenantId = firstOrg?.id;
    }

    // Fallback clinician ID
    let resolvedClinicianId = roundingClinicianId;
    if (!resolvedClinicianId) {
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      resolvedClinicianId = firstUser?.id;
    }

    const [newRound] = await db
      .insert(clinicalRounds)
      .values({
        tenantId: resolvedTenantId,
        patientId,
        encounterId: encounterId || null,
        bedNumber,
        wardDepartment,
        roundingClinicianId: resolvedClinicianId,
        acuityScore,
        vitalSummary,
        clinicalNotes,
        activeConcerns: activeConcerns || null,
        planOfCare,
        criticalAlerts,
        isEscalated: Boolean(isEscalated),
        nextRoundScheduledAt: nextRoundScheduledAt ? new Date(nextRoundScheduledAt) : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRound,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[CLINICAL ROUNDS POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH /api/v1/clinical/rounds — acknowledge alert or update round note
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { roundId, action, acknowledgedBy, resolutionNotes } = body;

    if (!roundId || !action) {
      return NextResponse.json({ success: false, error: "roundId and action are required." }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };

    if (action === "acknowledge_alert") {
      updateData.acknowledgedBy = acknowledgedBy || null;
      updateData.acknowledgedAt = new Date();
      updateData.isEscalated = false;
    } else if (action === "escalate") {
      updateData.isEscalated = true;
      updateData.acuityScore = "critical";
    }

    const [updated] = await db
      .update(clinicalRounds)
      .set(updateData)
      .where(eq(clinicalRounds.id, roundId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[CLINICAL ROUNDS PATCH]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
