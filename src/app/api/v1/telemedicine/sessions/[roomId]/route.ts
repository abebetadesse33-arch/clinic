import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telemedicineSessions, encounters, prescriptions, notifications, auditLogs, appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// ─── GET /api/v1/telemedicine/sessions/[roomId] ───────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const [session] = await db
      .select()
      .from(telemedicineSessions)
      .where(eq(telemedicineSessions.roomId, params.roomId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("GET telemedicine session error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch session" }, { status: 500 });
  }
}

// ─── PATCH /api/v1/telemedicine/sessions/[roomId] ────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const body = await req.json();
    const {
      status,
      startedAt,
      endedAt,
      durationSeconds,
      consultationNotes,
      aiConsultationSummary,
      diagnosis,
      prescriptionsToOrder,
    } = body;

    const [existing] = await db
      .select()
      .from(telemedicineSessions)
      .where(eq(telemedicineSessions.roomId, params.roomId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updateFields: Record<string, any> = {};
    if (status) updateFields.status = status;
    if (startedAt) updateFields.startedAt = new Date(startedAt);
    if (endedAt) updateFields.endedAt = new Date(endedAt);
    if (durationSeconds !== undefined) updateFields.durationSeconds = durationSeconds;
    if (consultationNotes) updateFields.consultationNotes = consultationNotes;
    if (aiConsultationSummary) updateFields.aiConsultationSummary = aiConsultationSummary;

    const [updated] = await db
      .update(telemedicineSessions)
      .set(updateFields)
      .where(eq(telemedicineSessions.roomId, params.roomId))
      .returning();

    // 1. If ending session & linked to an encounter, finalize encounter & matching appointments
    if (status === "completed" || status === "finished") {
      if (existing.encounterId) {
        try {
          await db
            .update(encounters)
            .set({
              status: "finished",
              endTime: new Date(),
              clinicalNotes: consultationNotes || "Telemedicine consultation completed.",
              ...(diagnosis && { chiefComplaint: diagnosis }),
            })
            .where(eq(encounters.id, existing.encounterId));
        } catch (e) {
          console.warn("Failed to finalize linked encounter:", e);
        }
      }

      // Synchronize appointment record matching this session
      try {
        const appointmentIdFromRoom = params.roomId.startsWith("room-") ? params.roomId.replace("room-", "") : "";
        if (appointmentIdFromRoom && appointmentIdFromRoom.length >= 8) {
          // Match by ID prefix or patient
          const [matchedAppt] = await db
            .select()
            .from(appointments)
            .where(eq(appointments.id, appointmentIdFromRoom))
            .limit(1);

          if (matchedAppt) {
            await db
              .update(appointments)
              .set({
                status: "completed",
                notes: consultationNotes ? `${matchedAppt.notes || ""} | Summary: ${consultationNotes}` : matchedAppt.notes,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, matchedAppt.id));
          }
        } else if (existing.patientId) {
          // Update most recent in-progress or scheduled appointment for this patient
          const [patientAppt] = await db
            .select()
            .from(appointments)
            .where(eq(appointments.patientId, existing.patientId))
            .limit(1);

          if (patientAppt && (patientAppt.status === "in_consultation" || patientAppt.status === "scheduled")) {
            await db
              .update(appointments)
              .set({
                status: "completed",
                notes: consultationNotes ? `${patientAppt.notes || ""} | Completed via Video Room` : patientAppt.notes,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, patientAppt.id));
          }
        }
      } catch (apptErr) {
        console.warn("Failed to synchronize appointment status:", apptErr);
      }

      // Audit Log
      try {
        await db.insert(auditLogs).values({
          tenantId: DEFAULT_TENANT_ID,
          action: "TELEMEDICINE_CONSULT_COMPLETED",
          entityType: "telemedicine_sessions",
          entityId: updated.id,
          summary: `Telemedicine session ${params.roomId} completed with duration ${durationSeconds || 0}s. Notes archived.`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        });
      } catch { }
    }

    // 2. If prescriptions passed in, create real signed prescriptions in EHR
    if (Array.isArray(prescriptionsToOrder) && prescriptionsToOrder.length > 0 && existing.patientId && existing.doctorId) {
      for (const rx of prescriptionsToOrder) {
        try {
          await db.insert(prescriptions).values({
            tenantId: DEFAULT_TENANT_ID,
            patientId: existing.patientId,
            doctorId: existing.doctorId,
            medicationName: rx.name || rx.medicationName || "Prescription",
            dosage: rx.dosage || "Standard Dose",
            frequency: rx.frequency || "Once daily",
            durationDays: rx.durationDays || 30,
            quantity: rx.quantity || 30,
            instructions: rx.instructions || "Take as directed after video consultation",
            status: "signed",
            prescriberSignature: "Signed via Telemedicine Exam Room",
            signedAt: new Date(),
          });
        } catch (rxErr) {
          console.warn("Failed to create prescription during session end:", rxErr);
        }
      }
    }

    return NextResponse.json({ session: updated, success: true });
  } catch (error: any) {
    console.error("PATCH telemedicine session error:", error);
    return NextResponse.json({ error: error.message || "Failed to update session" }, { status: 500 });
  }
}
