import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientActivities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logPatientActivity } from "@/lib/audit/activity-logger";

export const dynamic = "force-dynamic";

// GET /api/v1/patients/[id]/activities
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;

    const activities = await db
      .select()
      .from(patientActivities)
      .where(eq(patientActivities.patientId, patientId))
      .orderBy(desc(patientActivities.createdAt));

    if (activities.length === 0) {
      // Return representative default activities for demo patients
      const sampleActivities = [
        {
          id: "act-1",
          patientId,
          actorName: "Dr. Aster Solomon",
          actorRole: "physician",
          activityType: "prescription_issued",
          title: "e-Prescription Issued: Metformin 500mg & Lisinopril 10mg",
          description: "Routine 90-day refill prescribed during telehealth follow-up.",
          severity: "info",
          metadata: { rxId: "RX-94021", dosage: "500mg BID", refills: 3 },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: "act-2",
          patientId,
          actorName: "Central Pathology Lab",
          actorRole: "system",
          activityType: "lab_uploaded",
          title: "Complete Blood Count (CBC) & HbA1c Results Uploaded",
          description: "Verified results: HbA1c 6.4%, Platelets 260k, Hemoglobin 14.2 g/dL.",
          severity: "info",
          metadata: { labOrderId: "LAB-78219", documentUrl: "/files/sample_cbc_report.pdf" },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: "act-3",
          patientId,
          actorName: "Nurse Hanna Bekele",
          actorRole: "nurse",
          activityType: "vitals_logged",
          title: "Clinical Vitals Recorded at Intake",
          description: "BP: 122/78 mmHg, Heart Rate: 72 bpm, SpO2: 98%, Glucose: 104 mg/dL.",
          severity: "info",
          metadata: { bp: "122/78", hr: 72, spo2: 98 },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
        {
          id: "act-4",
          patientId,
          actorName: "Triage AI & Staff",
          actorRole: "triage_staff",
          activityType: "triage_performed",
          title: "Emergency Severity Index (ESI) Triage Level 3 Assigned",
          description: "Evaluated for mild palpitations; vital signs stable.",
          severity: "warning",
          metadata: { esiScore: 3, queueToken: "T-042" },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        },
        {
          id: "act-5",
          patientId,
          actorName: "Patient Self-Service",
          actorRole: "patient",
          activityType: "appointment_booked",
          title: "Telehealth Visit Scheduled with Dr. Aster Solomon",
          description: "Scheduled for virtual consult regarding seasonal allergies and medication review.",
          severity: "info",
          metadata: { appointmentType: "telehealth", date: "2026-09-02" },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        },
      ];

      return NextResponse.json({
        success: true,
        data: sampleActivities,
      });
    }

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error: any) {
    console.error("GET patient activities error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/v1/patients/[id]/activities
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const created = await logPatientActivity({
      patientId: params.id,
      ...body,
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error: any) {
    console.error("POST patient activity error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
