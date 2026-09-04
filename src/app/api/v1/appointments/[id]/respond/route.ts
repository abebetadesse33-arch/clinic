import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, notifications, patients, users, telemedicineSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const body = await req.json();
    const { action, clinicianId, rescheduleDate, rescheduleTime, declineReason } = body as {
      action: "accept" | "decline" | "reschedule";
      clinicianId?: string;
      rescheduleDate?: string;
      rescheduleTime?: string;
      declineReason?: string;
    };

    if (!action || !["accept", "decline", "reschedule"].includes(action)) {
      return NextResponse.json({ success: false, error: "action must be accept, decline, or reschedule" }, { status: 400 });
    }

    // Fetch the appointment
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
    if (!appt) {
      return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
    }

    // Fetch patient's userId for notification
    const [patientRec] = await db.select().from(patients).where(eq(patients.id, appt.patientId)).limit(1);
    const patientUserId = patientRec?.userId;

    // Fetch assigned clinician record
    const resolvedClinicianId = clinicianId || appt.clinicianId || "00000000-0000-0000-0000-000000000099";
    const [clinicianRec] = await db.select().from(users).where(eq(users.id, resolvedClinicianId)).limit(1);
    const clinicianName = clinicianRec?.fullName || "Your clinician";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (action === "accept") {
      // Update appointment status to confirmed
      await db
        .update(appointments)
        .set({ status: "confirmed" })
        .where(eq(appointments.id, appointmentId));

      // Build join URL for telehealth sessions
      let patientJoinUrl = `/patient/dashboard`;
      if (appt.appointmentType === "telehealth") {
        const [session] = await db
          .select()
          .from(telemedicineSessions)
          .where(eq(telemedicineSessions.patientId, appt.patientId))
          .limit(1);
        if (session) {
          patientJoinUrl = `${baseUrl}/telemedicine/${session.roomId}?role=patient&sessionId=${session.id}`;
        }
      }

      // Notify patient — appointment confirmed
      if (patientUserId) {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: patientUserId,
          senderUserId: resolvedClinicianId,
          type: "system_alert",
          title: "✅ Appointment Confirmed",
          body: `${clinicianName} has confirmed your ${appt.appointmentType === "telehealth" ? "video" : "in-person"} appointment on ${appt.scheduledDate} at ${appt.scheduledTime}. Queue token: ${appt.queueToken}`,
          priority: "high",
          actionUrl: patientJoinUrl,
          relatedEntityType: "appointments",
          relatedEntityId: appointmentId,
        });
      }

      return NextResponse.json({
        success: true,
        data: { status: "confirmed", appointmentId, message: "Appointment accepted. Patient notified." },
      });
    }

    if (action === "decline") {
      await db
        .update(appointments)
        .set({ status: "cancelled" })
        .where(eq(appointments.id, appointmentId));

      if (patientUserId) {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: patientUserId,
          senderUserId: resolvedClinicianId,
          type: "system_alert",
          title: "Appointment Update",
          body: `Your appointment on ${appt.scheduledDate} at ${appt.scheduledTime} could not be confirmed${declineReason ? ` (${declineReason})` : ""}. Please rebook at your convenience.`,
          priority: "high",
          actionUrl: `/patient/book`,
          relatedEntityType: "appointments",
          relatedEntityId: appointmentId,
        });
      }

      return NextResponse.json({
        success: true,
        data: { status: "cancelled", appointmentId, message: "Appointment declined. Patient notified." },
      });
    }

    if (action === "reschedule") {
      if (!rescheduleDate || !rescheduleTime) {
        return NextResponse.json({ success: false, error: "rescheduleDate and rescheduleTime are required" }, { status: 400 });
      }

      await db
        .update(appointments)
        .set({ scheduledDate: rescheduleDate as any, scheduledTime: rescheduleTime as any, status: "scheduled" })
        .where(eq(appointments.id, appointmentId));

      if (patientUserId) {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: patientUserId,
          senderUserId: resolvedClinicianId,
          type: "system_alert",
          title: "📅 Appointment Rescheduled",
          body: `${clinicianName} has rescheduled your appointment to ${rescheduleDate} at ${rescheduleTime}. Please confirm your availability.`,
          priority: "high",
          actionUrl: `/patient/dashboard`,
          relatedEntityType: "appointments",
          relatedEntityId: appointmentId,
        });
      }

      return NextResponse.json({
        success: true,
        data: { status: "rescheduled", appointmentId, newDate: rescheduleDate, newTime: rescheduleTime, message: "Patient notified of reschedule." },
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[APPT RESPOND] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Server error" }, { status: 500 });
  }
}
