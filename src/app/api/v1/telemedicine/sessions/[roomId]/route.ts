import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telemedicineSessions, encounters, prescriptions, notifications, auditLogs, appointments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateReturning } from "@/lib/db/returning";
import { requireAuthenticatedUser, isAdminUser, AuthenticatedUser, CLINICIAN_ROLES } from "@/lib/security/auth-session";
import { patients } from "@/db/schema";
import { or } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * A session is reachable by clinical staff in the same organization and by the
 * patient it belongs to. Anyone else gets a 404 so room ids cannot be probed.
 */
async function loadAuthorizedSession(
  req: NextRequest,
  roomId: string
): Promise<{ user: AuthenticatedUser; session: typeof telemedicineSessions.$inferSelect } | { response: NextResponse }> {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth;

  const [session] = await db.select().from(telemedicineSessions).where(eq(telemedicineSessions.roomId, roomId)).limit(1);
  const notFound = { response: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  if (!session) return notFound;

  if (auth.user.role === "patient") {
    const [own] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(or(eq(patients.userId, auth.user.id), eq(patients.email, auth.user.email)))
      .limit(1);
    if (!own || own.id !== session.patientId) return notFound;
  } else if (session.tenantId !== auth.user.organizationId) {
    return notFound;
  }
  return { user: auth.user, session };
}

// ─── GET /api/v1/telemedicine/sessions/[roomId] ───────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const access = await loadAuthorizedSession(_req, params.roomId);
    if ("response" in access) return access.response;
    const { session } = access;

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
    const access = await loadAuthorizedSession(req, params.roomId);
    if ("response" in access) return access.response;
    const { user } = access;
    const isPatient = user.role === "patient";

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

    const existing = access.session;

    // Patients can join or leave a call (status/timing) but cannot write clinical content.
    const wantsClinicalWrite =
      Boolean(consultationNotes || aiConsultationSummary || diagnosis) ||
      (Array.isArray(prescriptionsToOrder) && prescriptionsToOrder.length > 0);
    if (isPatient && wantsClinicalWrite) {
      return NextResponse.json({ error: "Forbidden: clinical documentation is staff-only" }, { status: 403 });
    }
    // Prescriptions are signed under the session doctor, so only that doctor (or an admin) may issue them.
    if (Array.isArray(prescriptionsToOrder) && prescriptionsToOrder.length > 0) {
      const isSessionDoctor = existing.doctorId === user.id && CLINICIAN_ROLES.includes(user.role as any);
      if (!isSessionDoctor && !isAdminUser(user)) {
        return NextResponse.json({ error: "Forbidden: only the session clinician can issue prescriptions" }, { status: 403 });
      }
    }

    const updateFields: Record<string, any> = {};
    if (status) updateFields.status = status;
    if (startedAt) updateFields.startedAt = new Date(startedAt);
    if (endedAt) updateFields.endedAt = new Date(endedAt);
    if (durationSeconds !== undefined) updateFields.durationSeconds = durationSeconds;
    if (consultationNotes) updateFields.consultationNotes = consultationNotes;
    if (aiConsultationSummary) updateFields.aiConsultationSummary = aiConsultationSummary;

    const [updated] = await updateReturning(db, telemedicineSessions, updateFields, eq(telemedicineSessions.roomId, params.roomId));

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
          tenantId: existing.tenantId,
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
            tenantId: existing.tenantId,
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
