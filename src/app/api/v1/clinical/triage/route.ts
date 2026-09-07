import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  patientJourneyEvents,
  patients,
  users,
  organizations,
  encounters,
} from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/clinical/triage — patients not yet in active journey (available for intake)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";

    // Find patient IDs currently in an active (in_progress) journey stage
    const activeJourneyPatients = await db
      .select({ patientId: patientJourneyEvents.patientId })
      .from(patientJourneyEvents)
      .where(eq(patientJourneyEvents.stageStatus, "in_progress"));

    const activePatientIds = activeJourneyPatients.map((e) => e.patientId);

    // Build where clauses
    let allPatients = await db
      .select({
        id: patients.id,
        mrn: patients.mrn,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        bloodType: patients.bloodType,
        phone: patients.phone,
        allergies: patients.allergies,
      })
      .from(patients)
      .orderBy(desc(patients.id));

    // Filter out already-active patients
    if (activePatientIds.length > 0) {
      allPatients = allPatients.filter((p) => !activePatientIds.includes(p.id));
    }

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      allPatients = allPatients.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q)
      );
    }

    // Calculate age
    const patientsWithAge = allPatients.map((p) => {
      const dob = new Date(p.dateOfBirth);
      const age = Math.floor(
        (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)
      );
      return { ...p, age };
    });

    // Fetch clinical staff for attending assignment
    const staff = await db
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(
        sql`${users.role} IN ('physician','nurse','nurse_practitioner','care_coordinator') AND ${users.isActive} = true`
      )
      .limit(20);

    return NextResponse.json({
      success: true,
      data: {
        availablePatients: patientsWithAge,
        staff,
        activeJourneyCount: activePatientIds.length,
        availableCount: patientsWithAge.length,
      },
    });
  } catch (error: any) {
    console.error("[TRIAGE GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/clinical/triage — register patient into triage stage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      chiefComplaint,
      triageLevel = 3, // ESI 1-5
      vitalsBp,
      vitalsHr,
      vitalsSpo2,
      vitalsTemp,
      vitalsRr,
      locationRoom,
      attendingStaffId,
      notes,
      createEncounter = true,
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId is required." },
        { status: 400 }
      );
    }

    // Resolve tenant ID
    const [firstOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .limit(1);

    if (!firstOrg) {
      return NextResponse.json(
        { success: false, error: "No organization found." },
        { status: 400 }
      );
    }

    // Resolve attending staff
    let resolvedStaffId = attendingStaffId;
    if (!resolvedStaffId) {
      const [nurse] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          sql`${users.role} IN ('nurse','physician','nurse_practitioner') AND ${users.isActive} = true`
        )
        .limit(1);
      resolvedStaffId = nurse?.id ?? null;
    }

    // Mark any existing in_progress stage for this patient as on_hold
    const [existingActive] = await db
      .select({ id: patientJourneyEvents.id })
      .from(patientJourneyEvents)
      .where(
        and(
          eq(patientJourneyEvents.patientId, patientId),
          eq(patientJourneyEvents.stageStatus, "in_progress")
        )
      )
      .limit(1);

    if (existingActive) {
      await db
        .update(patientJourneyEvents)
        .set({ stageStatus: "completed", exitedAt: new Date() })
        .where(eq(patientJourneyEvents.id, existingActive.id));
    }

    // Optionally create a new encounter for this visit
    let encounterId: string | null = null;
    if (createEncounter && resolvedStaffId) {
      try {
        const [newEncounter] = await db
          .insert(encounters)
          .values({
            tenantId: firstOrg.id,
            patientId,
            clinicianId: resolvedStaffId,
            encounterType: "in_person",
            status: "in_progress",
            admissionStatus: "outpatient",
            chiefComplaint: chiefComplaint || "Walk-in triage",
          } as any)
          .returning({ id: encounters.id });
        encounterId = newEncounter?.id ?? null;
      } catch (encErr) {
        // encounter creation is best-effort
        console.warn("[TRIAGE] Encounter creation failed:", encErr);
      }
    }

    // ESI level label
    const esiLabels: Record<number, string> = {
      1: "Resuscitation",
      2: "Emergent",
      3: "Urgent",
      4: "Less Urgent",
      5: "Non-Urgent",
    };

    // Create the triage journey event
    const triageNotes = [
      chiefComplaint ? `Chief Complaint: ${chiefComplaint}` : null,
      `ESI Level ${triageLevel} — ${esiLabels[triageLevel] || "Urgent"}`,
      vitalsBp ? `BP: ${vitalsBp}` : null,
      vitalsHr ? `HR: ${vitalsHr} bpm` : null,
      vitalsSpo2 ? `SpO2: ${vitalsSpo2}%` : null,
      vitalsTemp ? `Temp: ${vitalsTemp}°C` : null,
      vitalsRr ? `RR: ${vitalsRr}/min` : null,
      notes || null,
    ]
      .filter(Boolean)
      .join(" | ");

    const [newEvent] = await db
      .insert(patientJourneyEvents)
      .values({
        tenantId: firstOrg.id,
        patientId,
        encounterId,
        currentStage: "triage",
        previousStage: null,
        locationRoom: locationRoom || "Triage Bay",
        attendingStaffId: resolvedStaffId,
        stageStatus: "in_progress",
        notes: triageNotes,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: {
          journeyEvent: newEvent,
          encounterId,
          triageLevel,
          esiLabel: esiLabels[triageLevel] || "Urgent",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[TRIAGE POST]", error);
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 }
    );
  }
}
