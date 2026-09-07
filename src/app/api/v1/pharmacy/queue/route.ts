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
  stockMovements,
  invoices,
} from "@/db/schema";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";

const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

// ──────────────────────────────────────────────────────────
// GET /api/v1/pharmacy/queue
// Returns all active queue items with patient & Rx details
// ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");

    const conditions = [];
    if (status) {
      const statuses = status.split(",");
      conditions.push(inArray(pharmacyDispensingQueue.status, statuses as any[]));
    }
    if (patientId) {
      conditions.push(eq(pharmacyDispensingQueue.patientId, patientId));
    }

    const queue = await db
      .select({
        id: pharmacyDispensingQueue.id,
        prescriptionId: pharmacyDispensingQueue.prescriptionId,
        patientId: pharmacyDispensingQueue.patientId,
        doctorId: pharmacyDispensingQueue.doctorId,
        pharmacistId: pharmacyDispensingQueue.pharmacistId,
        nurseId: pharmacyDispensingQueue.nurseId,
        status: pharmacyDispensingQueue.status,
        deliveryMethod: pharmacyDispensingQueue.deliveryMethod,
        wardId: pharmacyDispensingQueue.wardId,
        bedNumber: pharmacyDispensingQueue.bedNumber,
        priority: pharmacyDispensingQueue.priority,
        medicationName: pharmacyDispensingQueue.medicationName,
        dosage: pharmacyDispensingQueue.dosage,
        quantity: pharmacyDispensingQueue.quantity,
        totalPrice: pharmacyDispensingQueue.totalPrice,
        currency: pharmacyDispensingQueue.currency,
        paymentVerifiedAt: pharmacyDispensingQueue.paymentVerifiedAt,
        dispensedAt: pharmacyDispensingQueue.dispensedAt,
        dispatchedAt: pharmacyDispensingQueue.dispatchedAt,
        nurseReceivedAt: pharmacyDispensingQueue.nurseReceivedAt,
        completedAt: pharmacyDispensingQueue.completedAt,
        pharmacistNotes: pharmacyDispensingQueue.pharmacistNotes,
        createdAt: pharmacyDispensingQueue.createdAt,
        // Patient info
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        patientPhone: patients.phone,
        // Prescription details
        rxStatus: prescriptions.status,
        rxPaymentStatus: prescriptions.paymentStatus,
        rxFrequency: prescriptions.frequency,
        rxRoute: prescriptions.route,
        rxInstructions: prescriptions.instructions,
        rxDurationDays: prescriptions.durationDays,
        rxInvoiceId: prescriptions.invoiceId,
      })
      .from(pharmacyDispensingQueue)
      .leftJoin(patients, eq(pharmacyDispensingQueue.patientId, patients.id))
      .leftJoin(prescriptions, eq(pharmacyDispensingQueue.prescriptionId, prescriptions.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        // STAT first, then urgent, then routine; within each by creation time
        sql`CASE ${pharmacyDispensingQueue.priority} WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END`,
        desc(pharmacyDispensingQueue.createdAt)
      );

    // Also get unread notification count
    const notifications = await db
      .select({ count: sql<number>`count(*)` })
      .from(pharmacyNotifications)
      .where(
        and(
          eq(pharmacyNotifications.recipientRole, "pharmacist"),
          sql`${pharmacyNotifications.readAt} IS NULL`
        )
      );

    return NextResponse.json({
      success: true,
      queue,
      unreadNotifications: Number(notifications[0]?.count ?? 0),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────
// POST /api/v1/pharmacy/queue
// Actions: dispense | dispatch_to_nurse | cancel | acknowledge
// ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, queueItemId, pharmacistId, nurseId, wardId, bedNumber, deliveryMethod, notes } = body;

    if (!queueItemId || !action) {
      return NextResponse.json({ success: false, error: "queueItemId and action are required" }, { status: 400 });
    }

    // Fetch queue item
    const [qItem] = await db
      .select()
      .from(pharmacyDispensingQueue)
      .where(eq(pharmacyDispensingQueue.id, queueItemId));

    if (!qItem) {
      return NextResponse.json({ success: false, error: "Queue item not found" }, { status: 404 });
    }

    // Fetch patient for notification
    const [patient] = await db.select().from(patients).where(eq(patients.id, qItem.patientId));

    if (action === "dispense") {
      // 1. Check payment is verified
      if (qItem.status !== "payment_verified") {
        return NextResponse.json({
          success: false,
          error: "Cannot dispense: payment not yet verified",
        }, { status: 400 });
      }

      // 2. Deduct from drug_batches (FEFO - First Expiry First Out)
      const batches = await db
        .select()
        .from(drugBatches)
        .leftJoin(drugCatalog, eq(drugBatches.drugId, drugCatalog.id))
        .where(
          and(
            sql`LOWER(${drugCatalog.genericName}) LIKE LOWER(${'%' + qItem.medicationName.split(' ')[0] + '%'})`,
            eq(drugBatches.status, "active"),
            sql`${drugBatches.quantityRemaining} > 0`
          )
        )
        .orderBy(drugBatches.expiryDate); // FEFO

      let remaining = qItem.quantity;
      for (const b of batches) {
        if (remaining <= 0) break;
        const batch = b.drug_batches;
        const deduct = Math.min(remaining, batch.quantityRemaining);
        const newQty = batch.quantityRemaining - deduct;
        remaining -= deduct;

        await db
          .update(drugBatches)
          .set({
            quantityRemaining: newQty,
            status: newQty === 0 ? "depleted" : batch.status,
            updatedAt: new Date(),
          })
          .where(eq(drugBatches.id, batch.id));

        // Log stock movement
        await db.insert(stockMovements).values({
          tenantId: qItem.tenantId,
          batchId: batch.id,
          movementType: "dispense",
          quantity: deduct,
          previousQuantity: batch.quantityRemaining,
          newQuantity: newQty,
          referenceType: "prescription",
          referenceId: qItem.prescriptionId,
          performedBy: pharmacistId || null,
          notes: `Auto-dispensed for patient Rx`,
        });
      }

      // 3. Update queue item
      await db
        .update(pharmacyDispensingQueue)
        .set({
          status: deliveryMethod === "pickup" ? "ready_for_pickup" : "being_dispensed",
          pharmacistId: pharmacistId || qItem.pharmacistId,
          dispensedAt: new Date(),
          pharmacistNotes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(pharmacyDispensingQueue.id, queueItemId));

      // 4. Update prescription status
      await db
        .update(prescriptions)
        .set({ status: "dispensed", pharmacistId: pharmacistId || null, dispensedAt: new Date() })
        .where(eq(prescriptions.id, qItem.prescriptionId));

      // 5. Notify patient
      if (patient?.userId) {
        await db.insert(pharmacyNotifications).values({
          tenantId: qItem.tenantId,
          queueItemId,
          prescriptionId: qItem.prescriptionId,
          recipientId: patient.userId,
          recipientRole: "patient",
          eventType: deliveryMethod === "pickup" ? "ready_for_pickup" : "dispense_started",
          title: deliveryMethod === "pickup"
            ? `✅ Your medicine is ready for pickup`
            : `💊 Your medicine is being prepared`,
          body: deliveryMethod === "pickup"
            ? `${qItem.medicationName} (${qItem.dosage}) is ready at the pharmacy counter. Please come collect it.`
            : `${qItem.medicationName} is being dispensed and will be delivered to your ward.`,
          metadata: { medicationName: qItem.medicationName, dosage: qItem.dosage },
        });
      }

      return NextResponse.json({ success: true, message: "Medicine dispensed successfully" });

    } else if (action === "dispatch_to_nurse") {
      if (!nurseId) {
        return NextResponse.json({ success: false, error: "nurseId required for dispatch" }, { status: 400 });
      }

      await db
        .update(pharmacyDispensingQueue)
        .set({
          status: "dispatched_to_nurse",
          nurseId,
          wardId: wardId || qItem.wardId,
          bedNumber: bedNumber || qItem.bedNumber,
          deliveryMethod: "nurse_delivery",
          dispatchedAt: new Date(),
          pharmacistNotes: notes || qItem.pharmacistNotes,
          updatedAt: new Date(),
        })
        .where(eq(pharmacyDispensingQueue.id, queueItemId));

      // Notify nurse
      await db.insert(pharmacyNotifications).values({
        tenantId: qItem.tenantId,
        queueItemId,
        prescriptionId: qItem.prescriptionId,
        recipientId: nurseId,
        recipientRole: "nurse",
        eventType: "dispatched_to_nurse",
        title: `💊 Medicine ready for delivery — ${patient?.firstName ?? "Patient"} ${patient?.lastName ?? ""}`,
        body: `${qItem.medicationName} (${qItem.dosage}) × ${qItem.quantity} has been dispensed. Please collect from pharmacy and deliver to ${wardId ?? "assigned ward"}${bedNumber ? `, Bed ${bedNumber}` : ""}.`,
        metadata: { medicationName: qItem.medicationName, dosage: qItem.dosage, wardId, bedNumber, patientMrn: patient?.mrn },
      });

      // Notify patient
      if (patient?.userId) {
        await db.insert(pharmacyNotifications).values({
          tenantId: qItem.tenantId,
          queueItemId,
          prescriptionId: qItem.prescriptionId,
          recipientId: patient.userId,
          recipientRole: "patient",
          eventType: "dispatched_to_nurse",
          title: `🚶 Your medicine is on its way`,
          body: `${qItem.medicationName} has been handed to a nurse and will be delivered to you shortly.`,
          metadata: { medicationName: qItem.medicationName },
        });
      }

      return NextResponse.json({ success: true, message: "Dispatched to nurse" });

    } else if (action === "nurse_received") {
      await db
        .update(pharmacyDispensingQueue)
        .set({ status: "nurse_received", nurseReceivedAt: new Date(), updatedAt: new Date() })
        .where(eq(pharmacyDispensingQueue.id, queueItemId));

      return NextResponse.json({ success: true, message: "Nurse acknowledged receipt" });

    } else if (action === "complete") {
      await db
        .update(pharmacyDispensingQueue)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(pharmacyDispensingQueue.id, queueItemId));

      return NextResponse.json({ success: true, message: "Dispensing workflow completed" });

    } else if (action === "cancel") {
      await db
        .update(pharmacyDispensingQueue)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(pharmacyDispensingQueue.id, queueItemId));

      return NextResponse.json({ success: true, message: "Queue item cancelled" });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
