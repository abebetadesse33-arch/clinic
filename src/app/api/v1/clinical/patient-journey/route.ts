import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientJourneyEvents, patients, users, organizations } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/clinical/patient-journey — live patient flow status across 6 stages
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const stage = searchParams.get("stage");
    const patientId = searchParams.get("patientId");

    // Fetch active journey events
    const events = await db
      .select({
        id: patientJourneyEvents.id,
        tenantId: patientJourneyEvents.tenantId,
        patientId: patientJourneyEvents.patientId,
        encounterId: patientJourneyEvents.encounterId,
        currentStage: patientJourneyEvents.currentStage,
        previousStage: patientJourneyEvents.previousStage,
        locationRoom: patientJourneyEvents.locationRoom,
        attendingStaffId: patientJourneyEvents.attendingStaffId,
        transitDurationSeconds: patientJourneyEvents.transitDurationSeconds,
        stageStatus: patientJourneyEvents.stageStatus,
        notes: patientJourneyEvents.notes,
        enteredAt: patientJourneyEvents.enteredAt,
        exitedAt: patientJourneyEvents.exitedAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        patientDateOfBirth: patients.dateOfBirth,
        patientGender: patients.gender,
        patientBloodType: patients.bloodType,
      })
      .from(patientJourneyEvents)
      .innerJoin(patients, eq(patientJourneyEvents.patientId, patients.id))
      .orderBy(desc(patientJourneyEvents.enteredAt));

    let filtered = events;
    if (stage) filtered = filtered.filter((e) => e.currentStage === stage);
    if (patientId) filtered = filtered.filter((e) => e.patientId === patientId);

    // Group by Stage for Kanban/Flow View
    const STAGES = ["triage", "waiting", "consultation", "lab_pending", "lab_ready", "radiology_pending", "pharmacy", "ward_admission", "discharged"];
    const groupedStages: Record<string, typeof filtered> = {};
    STAGES.forEach((s) => { groupedStages[s] = []; });

    // Keep latest active stage per patient
    const latestPatientEvents = new Map<string, typeof filtered[0]>();
    events.forEach((ev) => {
      if (!latestPatientEvents.has(ev.patientId)) {
        latestPatientEvents.set(ev.patientId, ev);
        if (groupedStages[ev.currentStage]) {
          groupedStages[ev.currentStage].push(ev);
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        events: filtered,
        activePatientsByStage: groupedStages,
        totalActivePatients: latestPatientEvents.size,
        triageCount: groupedStages.triage?.length || 0,
        consultationCount: groupedStages.consultation?.length || 0,
        labPendingCount: groupedStages.lab_pending?.length || 0,
        labReadyCount: groupedStages.lab_ready?.length || 0,
        wardCount: groupedStages.ward_admission?.length || 0,
        dischargedTodayCount: groupedStages.discharged?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("[PATIENT JOURNEY GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/clinical/patient-journey — transition patient to a new stage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      patientId,
      encounterId,
      currentStage,
      previousStage,
      locationRoom,
      attendingStaffId,
      notes,
    } = body;

    if (!patientId || !currentStage) {
      return NextResponse.json({ success: false, error: "patientId and currentStage are required." }, { status: 400 });
    }

    // Resolve tenant ID fallback
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      resolvedTenantId = firstOrg?.id;
    }

    if (!resolvedTenantId) {
      return NextResponse.json({ success: false, error: "No organization tenant found." }, { status: 400 });
    }

    // Mark previous active stage event as completed/exited
    const [lastActive] = await db
      .select()
      .from(patientJourneyEvents)
      .where(and(eq(patientJourneyEvents.patientId, patientId), eq(patientJourneyEvents.stageStatus, "in_progress")))
      .orderBy(desc(patientJourneyEvents.enteredAt))
      .limit(1);

    if (lastActive) {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - new Date(lastActive.enteredAt).getTime()) / 1000));
      await db
        .update(patientJourneyEvents)
        .set({
          stageStatus: "completed",
          exitedAt: new Date(),
          transitDurationSeconds: durationSeconds,
        })
        .where(eq(patientJourneyEvents.id, lastActive.id));
    }

    // Insert new journey event
    const [newEvent] = await db
      .insert(patientJourneyEvents)
      .values({
        tenantId: resolvedTenantId,
        patientId,
        encounterId: encounterId || null,
        currentStage,
        previousStage: previousStage || lastActive?.currentStage || null,
        locationRoom: locationRoom || null,
        attendingStaffId: attendingStaffId || null,
        stageStatus: "in_progress",
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newEvent,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[PATIENT JOURNEY POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
