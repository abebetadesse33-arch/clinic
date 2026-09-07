import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  payments,
  invoices,
  auditLogs,
  prescriptions,
  pharmacyDispensingQueue,
  pharmacyNotifications,
  patients,
  users,
} from "@/db/schema";
import { createPaymentSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/payments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");
    const patientId = searchParams.get("patientId");

    if (invoiceId) {
      const data = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .orderBy(desc(payments.paidAt));
      return NextResponse.json({ success: true, data });
    }

    if (patientId) {
      const data = await db
        .select()
        .from(payments)
        .where(eq(payments.patientId, patientId))
        .orderBy(desc(payments.paidAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.paidAt))
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/v1/payments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createPaymentSchema.parse(body);

    const paymentNumber = `PAY-${Date.now()}`;
    const receiptNumber = `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;

    const [newPayment] = await db
      .insert(payments)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        invoiceId: validated.invoiceId,
        patientId: validated.patientId,
        paymentNumber,
        amount: validated.amount.toString(),
        currency: validated.currency || "ETB",
        paymentMethod: validated.paymentMethod,
        transactionReference: validated.transactionReference || `TX-${Date.now()}`,
        receiptNumber,
        status: "completed",
        paidAt: new Date(),
      })
      .returning();

    // Update invoice paid amount and status
    const invRes = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, validated.invoiceId))
      .limit(1);

    if (invRes && invRes.length > 0) {
      const inv = invRes[0];
      const newPaid = parseFloat(inv.paidAmount) + validated.amount;
      const total = parseFloat(inv.totalAmount);
      const newStatus = newPaid >= total ? "paid" : "partially_paid";

      await db
        .update(invoices)
        .set({
          paidAmount: newPaid.toString(),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, validated.invoiceId));

      // ── PHARMACY AUTOMATION TRIGGER ──
      // If invoice was paid and corresponds to a prescription:
      if (newStatus === "paid") {
        // 1. Update matching prescriptions
        const matchedRxs = await db
          .update(prescriptions)
          .set({
            paymentStatus: "paid",
            status: "payment_cleared",
            paidAt: new Date(),
            transactionRef: newPayment.transactionReference,
          })
          .where(eq(prescriptions.invoiceId, validated.invoiceId))
          .returning();

        for (const rx of matchedRxs) {
          // 2. Advance queue item to payment_verified
          const [updatedQueueItem] = await db
            .update(pharmacyDispensingQueue)
            .set({
              status: "payment_verified",
              paymentVerifiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(pharmacyDispensingQueue.prescriptionId, rx.id))
            .returning();

          // 3. Fetch patient info
          const [patient] = await db
            .select()
            .from(patients)
            .where(eq(patients.id, rx.patientId));

          // 4. Notify Pharmacists
          const pharmacists = await db
            .select()
            .from(users)
            .where(eq(users.role, "pharmacist"));

          for (const ph of pharmacists) {
            await db.insert(pharmacyNotifications).values({
              tenantId: DEFAULT_TENANT_ID,
              queueItemId: updatedQueueItem ? updatedQueueItem.id : null,
              prescriptionId: rx.id,
              recipientId: ph.id,
              recipientRole: "pharmacist",
              eventType: "payment_confirmed",
              title: `💳 Payment Confirmed — ${rx.medicationName}`,
              body: `Payment of ${newPayment.currency} ${newPayment.amount} confirmed for ${patient ? `${patient.firstName} ${patient.lastName}` : "Patient"} (MRN: ${patient?.mrn ?? ""}). Please verify & dispense ${rx.medicationName} (${rx.dosage}).`,
              metadata: {
                prescriptionId: rx.id,
                medicationName: rx.medicationName,
                dosage: rx.dosage,
                patientMrn: patient?.mrn,
                receiptNumber,
              },
            });
          }

          // 5. Notify Patient
          if (patient?.userId) {
            await db.insert(pharmacyNotifications).values({
              tenantId: DEFAULT_TENANT_ID,
              queueItemId: updatedQueueItem ? updatedQueueItem.id : null,
              prescriptionId: rx.id,
              recipientId: patient.userId,
              recipientRole: "patient",
              eventType: "payment_confirmed",
              title: `✅ Payment Received for ${rx.medicationName}`,
              body: `Your payment of ${newPayment.currency} ${newPayment.amount} has been processed. The pharmacist has been alerted to prepare your medication immediately.`,
              metadata: {
                prescriptionId: rx.id,
                receiptNumber,
              },
            });
          }
        }
      }
    }

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "PAYMENT_PROCESSED",
      entityType: "payments",
      entityId: newPayment.id,
      summary: `Processed payment of ${newPayment.amount} ${newPayment.currency} via ${newPayment.paymentMethod} (Receipt: ${receiptNumber}) for Invoice ${validated.invoiceId}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      {
        success: true,
        data: newPayment,
        message: "Payment processed successfully, receipt generated, and pharmacy workflow auto-advanced",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment" },
      { status: 500 }
    );
  }
}
