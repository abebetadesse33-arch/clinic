import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import {
  invoices,
  invoiceItems,
  labOrders,
  prescriptions,
  notifications,
  patients,
  users,
  auditLogs,
  systemPaymentSettings,
} from "@/db/schema";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { EncounterTabService } from "@/lib/services/encounter-tab-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/billing/pay-and-notify
 * Confirms payment for lab/pharmacy invoice, then auto-dispatches
 * role-targeted push notifications to lab technicians and/or pharmacists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceId,
      paymentMethod = "cash",
      transactionRef: clientRef,
      collectedBy, // userId of cashier / front-desk
    } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "invoiceId is required." },
        { status: 400 }
      );
    }

    // Secure Identity Resolution: Extract cashier/collector directly from verified server session cookie
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    // Never blindly trust untrusted client body for identity; fallback only if valid UUID format
    const effectiveCollectorId = sessionUserId || (collectedBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collectedBy) ? collectedBy : undefined);

    // 1. Fetch Invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }
    if (invoice.status === "paid") {
      return NextResponse.json(
        { success: false, error: "This invoice has already been paid." },
        { status: 409 }
      );
    }

    // 2. Fetch Invoice Items to detect lab vs. pharmacy
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    const hasLab = items.some(
      (i) =>
        i.serviceCode.startsWith("LAB_") || i.serviceCode.startsWith("IMAGING_")
    );
    const hasPharmacy = items.some((i) => i.serviceCode.startsWith("RX_"));

    // 3. Fetch payment gate settings
    const [settings] = await db.select().from(systemPaymentSettings).limit(1);
    const autoNotifyLab = settings?.autoNotifyLabOnPayment !== false;
    const autoNotifyPharmacy = settings?.autoNotifyPharmacyOnPayment !== false;

    // 4. Mark invoice as PAID
    const transactionRef =
      clientRef ||
      `TXN-${paymentMethod.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const paidAt = new Date();

    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        status: "paid",
        paymentMethod,
        transactionRef,
        paidAt,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    // 4B. Charge active Encounter Tab if encounter linked or payment is encounter_tab
    if (invoice.encounterId) {
      for (const item of items) {
        await EncounterTabService.chargeTab({
          encounterId: invoice.encounterId,
          serviceCode: item.serviceCode,
          description: item.description,
          amountEtb: Number(item.totalPrice) || 0,
          department: item.serviceCode.startsWith("LAB_") ? "Laboratory" : item.serviceCode.startsWith("RX_") ? "Pharmacy" : "General",
        }).catch(() => {});
      }
    }

    // 5. Update linked Lab Orders → payment_cleared
    const updatedLabOrders = [];
    if (hasLab) {
      const labList = await db
        .update(labOrders)
        .set({
          paymentStatus: "paid",
          status: "payment_cleared",
          transactionRef,
          paidAt,
          invoiceId: invoice.id,
        })
        .where(eq(labOrders.invoiceId, invoice.id))
        .returning();
      updatedLabOrders.push(...labList);
    }

    // 6. Update linked Prescriptions → payment_cleared
    const updatedPrescriptions = [];
    if (hasPharmacy) {
      const rxList = await db
        .update(prescriptions)
        .set({
          paymentStatus: "paid",
          status: "payment_cleared",
          transactionRef,
          paidAt,
          invoiceId: invoice.id,
        })
        .where(eq(prescriptions.invoiceId, invoice.id))
        .returning();
      updatedPrescriptions.push(...rxList);
    }

    // 7. Fetch Patient for notification body
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, invoice.patientId))
      .limit(1);

    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Patient";
    const orgId = invoice.tenantId || "00000000-0000-0000-0000-000000000001";

    let notificationsSentCount = 0;

    // 8. Auto-dispatch notification to Patient (if patient has linked user)
    if (patient?.userId) {
      await dispatchNotification({
        category: "billing",
        type: "payment_received",
        title: `🧾 Payment Received: ETB ${invoice.totalAmount}`,
        body: `Your payment of ETB ${invoice.totalAmount} was processed successfully (Txn: ${transactionRef}). Your care orders have been released to the medical team.`,
        priority: "normal",
        recipientUserId: patient.userId,
        senderUserId: effectiveCollectorId,
        actionUrl: `/billing/pos`,
        actionText: "View Payment Receipt",
        relatedEntityType: "invoices",
        relatedEntityId: invoice.id,
        metadata: { invoiceId: invoice.id, transactionRef, totalAmount: invoice.totalAmount, collectorId: effectiveCollectorId },
      });
      notificationsSentCount++;
    }

    // 9. Auto-dispatch notification to Lab technicians
    if (hasLab && autoNotifyLab) {
      await dispatchNotification({
        category: "orders",
        type: "order_placed",
        title: "✅ Lab Payment Cleared — Commence Processing",
        body: `Payment of ${invoice.totalAmount} ETB confirmed for ${patientName} (${patient?.mrn || "MRN"}). Txn: ${transactionRef}. ${updatedLabOrders.length} lab order(s) are now ready for specimen collection.`,
        priority: updatedLabOrders.some((o: any) => o.priority === "stat" || o.priority === "urgent") ? "critical" : "high",
        targetRole: "lab_technician",
        actionUrl: "/biologist",
        actionText: "Process Lab Orders",
        relatedEntityType: "invoices",
        relatedEntityId: invoice.id,
        metadata: { invoiceId: invoice.id, transactionRef, patientMrn: patient?.mrn },
      });
      notificationsSentCount++;
    }

    // 10. Auto-dispatch notification to Pharmacists
    if (hasPharmacy && autoNotifyPharmacy) {
      await dispatchNotification({
        category: "orders",
        type: "order_placed",
        title: "💊 Prescription Payment Cleared — Ready to Dispense",
        body: `Payment of ${invoice.totalAmount} ETB cleared for ${patientName} (${patient?.mrn || "MRN"}). Txn: ${transactionRef}. ${updatedPrescriptions.length} prescription(s) authorized for immediate dispensing.`,
        priority: "high",
        targetRole: "pharmacist",
        actionUrl: "/pharmacy",
        actionText: "Dispense Medications",
        relatedEntityType: "invoices",
        relatedEntityId: invoice.id,
        metadata: { invoiceId: invoice.id, transactionRef, patientMrn: patient?.mrn },
      });
      notificationsSentCount++;
    }

    // 11. Audit log
    try {
      await db.insert(auditLogs).values({
        tenantId: orgId,
        userId: effectiveCollectorId,
        action: "LAB_PHARMACY_PAYMENT_CLEARED",
        entityType: "invoices",
        entityId: invoice.id,
        summary: `Payment of ${invoice.totalAmount} ETB cleared for ${patientName} via ${paymentMethod.toUpperCase()} (Ref: ${transactionRef}). Lab: ${updatedLabOrders.length}, Rx: ${updatedPrescriptions.length}. Notified ${notificationsSentCount} staff.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch { }

    // Fire workflow engine — notify patient at each step of PAYMENT_COMPLETED workflows
    // Explicitly pass the verified server session user ID as triggeredByUserId
    if (invoice.patientId) {
      executeWorkflowsForTrigger({
        triggerEvent: "PAYMENT_COMPLETED",
        patientId: invoice.patientId,
        triggeredByUserId: effectiveCollectorId,
        subjectLabel: `Invoice #${invoice.invoiceNumber || invoiceId} — ETB ${invoice.totalAmount}`,
        patientActionUrl: "/patient/dashboard",
        metadata: { invoiceId: invoice.id, transactionRef, paymentMethod, collectorId: effectiveCollectorId },
      }).catch((err) => console.error("[WorkflowExecutor:payment]", err));
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice: updatedInvoice,
        transactionRef,
        paidAt: paidAt.toISOString(),
        labOrdersCleared: updatedLabOrders.length,
        prescriptionsCleared: updatedPrescriptions.length,
        notificationsDispatched: notificationsSentCount,
      },
      message: `Payment of ${invoice.totalAmount} ETB confirmed. ${notificationsSentCount} staff notified automatically.`,
    });
  } catch (error: any) {
    console.error("Error in pay-and-notify:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Payment processing failed" },
      { status: 500 }
    );
  }
}