import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, auditLogs, patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";
import { dispatchNotification } from "@/lib/notifications/notification-service";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/appointments/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, params.id))
      .limit(1);

    if (!appt) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: appt });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/appointments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const sessionUserId = auth.user.id;
    const body = await req.json();
    const { status, scheduledDate, scheduledTime, notes, reason, specialty, clinicianId, cancelReason, rescheduleReason } = body;

    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status) updateFields.status = status;
    if (scheduledDate) updateFields.scheduledDate = scheduledDate;
    if (scheduledTime) updateFields.scheduledTime = scheduledTime;
    if (reason) updateFields.reason = reason;
    if (notes !== undefined) updateFields.notes = notes;
    if (specialty) updateFields.specialty = specialty;
    if (clinicianId) updateFields.clinicianId = clinicianId;

    if (rescheduleReason) {
      updateFields.notes = updateFields.notes 
        ? `${updateFields.notes} | Rescheduled: ${rescheduleReason}` 
        : `Rescheduled: ${rescheduleReason}`;
    }
    if (cancelReason) {
      updateFields.notes = updateFields.notes 
        ? `${updateFields.notes} | Cancellation Reason: ${cancelReason}` 
        : `Cancellation Reason: ${cancelReason}`;
    }

    const [updated] = await db
      .update(appointments)
      .set(updateFields)
      .where(eq(appointments.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    const actionType = status === "cancelled" 
      ? "APPOINTMENT_CANCELLED" 
      : rescheduleReason 
        ? "APPOINTMENT_RESCHEDULED" 
        : "APPOINTMENT_STATUS_CHANGED";

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      userId: sessionUserId,
      action: actionType,
      entityType: "appointments",
      entityId: updated.id,
      summary: `Appointment ${updated.id} updated: status=${updated.status}, date=${updated.scheduledDate} ${updated.scheduledTime}. ${cancelReason || rescheduleReason || ""}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // Notify patient & clinician
    try {
      const [patientRec] = await db.select().from(patients).where(eq(patients.id, updated.patientId)).limit(1);
      const patientUserId = patientRec?.userId;
      
      const notifTitle = status === "cancelled" 
        ? "❌ Appointment Cancelled" 
        : rescheduleReason 
          ? "🔄 Appointment Rescheduled" 
          : `📅 Appointment Status: ${status?.toUpperCase()}`;

      const notifBody = status === "cancelled"
        ? `Your appointment scheduled for ${updated.scheduledDate} has been cancelled.${cancelReason ? ` Reason: ${cancelReason}` : ""}`
        : `Your appointment is now confirmed for ${updated.scheduledDate} at ${updated.scheduledTime}.`;

      if (patientUserId && patientUserId.length === 36) {
        await dispatchNotification({
          category: "appointments",
          type: "appointment_status_changed",
          title: notifTitle,
          body: notifBody,
          priority: "normal",
          recipientUserId: patientUserId,
          senderUserId: sessionUserId,
          actionUrl: "/patient/appointments",
          actionText: "View Appointment",
          relatedEntityType: "appointments",
          relatedEntityId: updated.id,
          metadata: {
            status: updated.status,
            scheduledDate: updated.scheduledDate,
            scheduledTime: updated.scheduledTime,
            actorUserId: sessionUserId,
          },
        });
      }

      if (updated.clinicianId && updated.clinicianId.length === 36) {
        await dispatchNotification({
          category: "appointments",
          type: "schedule_update",
          title: `🔔 Schedule Update: ${notifTitle}`,
          body: `Patient ${patientRec ? `${patientRec.firstName} ${patientRec.lastName}` : "Record"} appointment on ${updated.scheduledDate} at ${updated.scheduledTime} status changed to ${updated.status}.`,
          priority: "normal",
          recipientUserId: updated.clinicianId,
          senderUserId: sessionUserId,
          actionUrl: "/appointments",
          actionText: "Open Schedule",
          relatedEntityType: "appointments",
          relatedEntityId: updated.id,
          metadata: {
            appointmentId: updated.id,
            patientId: updated.patientId,
            status: updated.status,
            actorUserId: sessionUserId,
          },
        });
      }
    } catch (nErr) {
      console.warn("Notification error during appointment patch:", nErr);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Appointment updated successfully`,
    });
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update appointment" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/appointments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const [deleted] = await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(appointments.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}

