import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  pharmacyDispensingQueue,
  pharmacyNotifications,
  prescriptions,
  patients,
  users,
  drugCatalog,
  drugBatches,
  invoices,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

// ──────────────────────────────────────────────────────────
// GET /api/v1/pharmacy/notify?recipientId=&role=
// Returns in-app notifications for a specific user
// ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get("recipientId");
    const role = searchParams.get("role");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!recipientId) {
      return NextResponse.json({ success: false, error: "recipientId is required" }, { status: 400 });
    }

    const conditions = [eq(pharmacyNotifications.recipientId, recipientId)];
    if (unreadOnly) {
      conditions.push(sql`${pharmacyNotifications.readAt} IS NULL`);
    }

    const notifications = await db
      .select()
      .from(pharmacyNotifications)
      .where(and(...conditions))
      .orderBy(desc(pharmacyNotifications.createdAt))
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────
// POST /api/v1/pharmacy/notify
// Actions: notify_payment_due | mark_read | notify_custom
// Also called automatically on prescription sign to push notifications
// ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "notify_payment_due") {
      // Called when doctor signs a prescription
      // Auto-calculates price and notifies patient + doctor
      const { prescriptionId } = body;

      const [rx] = await db
        .select({
          id: prescriptions.id,
          patientId: prescriptions.patientId,
          doctorId: prescriptions.doctorId,
          medicationName: prescriptions.medicationName,
          dosage: prescriptions.dosage,
          quantity: prescriptions.quantity,
          totalPrice: prescriptions.totalPrice,
          currency: prescriptions.currency,
          status: prescriptions.status,
          // Patient info via join
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientUserId: patients.userId,
        })
        .from(prescriptions)
        .leftJoin(patients, eq(prescriptions.patientId, patients.id))
        .where(eq(prescriptions.id, prescriptionId));

      if (!rx) {
        return NextResponse.json({ success: false, error: "Prescription not found" }, { status: 404 });
      }

      const totalPrice = Number(rx.totalPrice ?? 0);
      const currency = rx.currency ?? "ETB";

      // Notify patient (if patient has a user account)
      const notifs = [];

      if (rx.patientUserId) {
        notifs.push({
          tenantId: DEFAULT_TENANT,
          prescriptionId,
          recipientId: rx.patientUserId,
          recipientRole: "patient" as const,
          eventType: "payment_requested" as const,
          title: `💊 Prescription Ready — Payment Due`,
          body: `Dr. signed a prescription for ${rx.medicationName} (${rx.dosage}). Amount due: ${currency} ${totalPrice.toFixed(2)}. You can pay now online or at the pharmacy counter.`,
          metadata: { prescriptionId, medicationName: rx.medicationName, totalPrice, currency },
        });
      }

      // Notify doctor with expected payment
      notifs.push({
        tenantId: DEFAULT_TENANT,
        prescriptionId,
        recipientId: rx.doctorId,
        recipientRole: "doctor" as const,
        eventType: "prescription_signed" as const,
        title: `✅ Prescription Sent — ${rx.medicationName}`,
        body: `Patient ${rx.patientFirstName ?? ""} ${rx.patientLastName ?? ""} has been notified of the payment amount: ${currency} ${totalPrice.toFixed(2)} for ${rx.medicationName}.`,
        metadata: { prescriptionId, medicationName: rx.medicationName, totalPrice, currency },
      });

      if (notifs.length > 0) {
        await db.insert(pharmacyNotifications).values(notifs);
      }

      // Mark prescription notification times
      await db
        .update(prescriptions)
        .set({ patientNotifiedAt: new Date(), doctorNotifiedAt: new Date() })
        .where(eq(prescriptions.id, prescriptionId));

      return NextResponse.json({ success: true, message: "Notifications sent", notificationCount: notifs.length });

    } else if (action === "payment_confirmed") {
      // Called by payment webhook / cashier when patient pays
      const { prescriptionId, queueItemId } = body;

      // Update queue item status
      if (queueItemId) {
        await db
          .update(pharmacyDispensingQueue)
          .set({ status: "payment_verified", paymentVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(pharmacyDispensingQueue.id, queueItemId));
      }

      // Fetch rx info for notification
      const [rx] = await db
        .select({
          id: prescriptions.id,
          medicationName: prescriptions.medicationName,
          dosage: prescriptions.dosage,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientMrn: patients.mrn,
        })
        .from(prescriptions)
        .leftJoin(patients, eq(prescriptions.patientId, patients.id))
        .where(eq(prescriptions.id, prescriptionId));

      // Find pharmacists to notify
      const pharmacists = await db
        .select()
        .from(users)
        .where(eq(users.role, "pharmacist"));

      for (const ph of pharmacists) {
        await db.insert(pharmacyNotifications).values({
          tenantId: DEFAULT_TENANT,
          prescriptionId,
          queueItemId: queueItemId ?? null,
          recipientId: ph.id,
          recipientRole: "pharmacist",
          eventType: "payment_confirmed",
          title: `💳 Payment Confirmed — Please Dispense`,
          body: `Payment received for ${rx?.medicationName ?? "medication"} (${rx?.dosage ?? ""}) — Patient: ${rx?.patientFirstName ?? ""} ${rx?.patientLastName ?? ""} (MRN: ${rx?.patientMrn ?? ""}). Please dispense immediately.`,
          metadata: { prescriptionId, medicationName: rx?.medicationName, patientMrn: rx?.patientMrn },
        });
      }

      return NextResponse.json({ success: true, message: "Pharmacists notified of payment" });

    } else if (action === "mark_read") {
      const { notificationId, recipientId } = body;
      await db
        .update(pharmacyNotifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(pharmacyNotifications.id, notificationId),
            eq(pharmacyNotifications.recipientId, recipientId)
          )
        );
      return NextResponse.json({ success: true, message: "Marked as read" });

    } else if (action === "mark_all_read") {
      const { recipientId } = body;
      await db
        .update(pharmacyNotifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(pharmacyNotifications.recipientId, recipientId),
            sql`${pharmacyNotifications.readAt} IS NULL`
          )
        );
      return NextResponse.json({ success: true, message: "All notifications marked as read" });

    } else if (action === "send_custom") {
      const { recipientId, recipientRole, title, body: msgBody, eventType, metadata, prescriptionId, queueItemId } = body;
      const [notif] = await db
        .insert(pharmacyNotifications)
        .values({
          tenantId: DEFAULT_TENANT,
          recipientId,
          recipientRole,
          eventType: eventType ?? "prescription_signed",
          title,
          body: msgBody,
          metadata: metadata ?? {},
          prescriptionId: prescriptionId ?? null,
          queueItemId: queueItemId ?? null,
        })
        .returning();
      return NextResponse.json({ success: true, notification: notif });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
