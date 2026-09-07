import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  prescriptions,
  auditLogs,
  drugCatalog,
  invoices,
  invoiceItems,
  pharmacyDispensingQueue,
  pharmacyNotifications,
  patients,
  users,
} from "@/db/schema";
import { createPrescriptionSchema } from "@/lib/validations/schemas";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/prescriptions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    if (patientId) {
      const data = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patientId))
        .orderBy(desc(prescriptions.createdAt));
      return NextResponse.json({ success: true, data });
    }

    if (status) {
      const data = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.status, status as any))
        .orderBy(desc(prescriptions.createdAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(prescriptions)
      .orderBy(desc(prescriptions.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

// POST /api/v1/prescriptions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createPrescriptionSchema.parse(body);

    // Secure Identity Resolution: Prioritize authenticated server session ID over client body
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    let docId = sessionUserId;

    // Fall back to client-provided doctorId only if not authenticated as a session user
    if (!docId || docId.length !== 36) {
      docId = body.doctorId;
    }

    if (!docId || docId.length !== 36) {
      const [physicianUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "physician" as any))
        .limit(1);

      if (physicianUser) {
        docId = physicianUser.id;
      } else {
        const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
        docId = anyUser?.id || "00000000-0000-0000-0000-000000000001";
      }
    }

    const sigToken = crypto
      .createHash("sha256")
      .update(`${docId}-${validated.medicationName}-${Date.now()}`)
      .digest("hex")
      .substring(0, 24);

    // 1. Calculate dynamic drug price from catalog
    const drugMatch = await db
      .select()
      .from(drugCatalog)
      .where(
        sql`LOWER(${drugCatalog.genericName}) LIKE LOWER(${'%' + validated.medicationName.split(' ')[0] + '%'}) OR LOWER(${drugCatalog.brandName}) LIKE LOWER(${'%' + validated.medicationName.split(' ')[0] + '%'})`
      )
      .limit(1);

    const unitPriceNum = drugMatch.length > 0 ? parseFloat(drugMatch[0].defaultSellingPrice || "45.00") : 45.00;
    const quantityNum = validated.dispenseQuantity || 1;
    const totalPriceNum = unitPriceNum * quantityNum;
    const unitPriceStr = unitPriceNum.toFixed(2);
    const totalPriceStr = totalPriceNum.toFixed(2);

    // 2. Fetch patient details for notification
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, validated.patientId));

    // 3. Create Invoice
    const invoiceNum = `INV-PHARM-${Date.now().toString().slice(-6)}`;
    const [inv] = await db
      .insert(invoices)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        invoiceNumber: invoiceNum,
        totalAmount: totalPriceStr,
        subtotal: totalPriceStr,
        status: "issued",
      })
      .returning();

    // 4. Create Invoice Item
    await db.insert(invoiceItems).values({
      invoiceId: inv.id,
      serviceCode: "PHARM_MEDICATION",
      description: `${validated.medicationName} ${validated.dosage}`,
      quantity: quantityNum,
      unitPrice: unitPriceStr,
      totalPrice: totalPriceStr,
    });

    // 5. Insert Prescription
    const [newRx] = await db
      .insert(prescriptions)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        doctorId: docId,
        medicationName: validated.medicationName,
        dosage: validated.dosage,
        frequency: validated.frequency,
        route: validated.route || "Oral",
        durationDays: validated.durationDays,
        quantity: quantityNum,
        dispenseQuantity: quantityNum,
        refillsAllowed: validated.refills || 0,
        instructions: validated.prescriberNotes || `Take ${validated.dosage} ${validated.frequency} for ${validated.durationDays} days as directed.`,
        indication: validated.indication,
        status: "signed",
        prescriberSignature: `DIGISIG-${sigToken}`,
        signedAt: new Date(),
        unitPrice: unitPriceStr,
        totalPrice: totalPriceStr,
        currency: "ETB",
        paymentStatus: "unpaid",
        invoiceId: inv.id,
        deliveryMethod: body.deliveryMethod || "pickup",
        wardId: body.wardId || null,
        bedNumber: body.bedNumber || null,
        patientNotifiedAt: new Date(),
        doctorNotifiedAt: new Date(),
      })
      .returning();

    // 6. Enqueue in Pharmacy Dispensing Queue
    const [queueItem] = await db
      .insert(pharmacyDispensingQueue)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        prescriptionId: newRx.id,
        patientId: validated.patientId,
        doctorId: docId,
        status: "awaiting_payment",
        deliveryMethod: body.deliveryMethod || "pickup",
        wardId: body.wardId || null,
        bedNumber: body.bedNumber || null,
        priority: body.priority || "routine",
        medicationName: validated.medicationName,
        dosage: validated.dosage,
        quantity: quantityNum,
        totalPrice: totalPriceStr,
        currency: "ETB",
      })
      .returning();

    // 7. Auto-notify Patient
    if (patient?.userId) {
      await db.insert(pharmacyNotifications).values({
        tenantId: DEFAULT_TENANT_ID,
        queueItemId: queueItem.id,
        prescriptionId: newRx.id,
        recipientId: patient.userId,
        recipientRole: "patient",
        eventType: "payment_requested",
        title: `💊 Prescription Ready: ${validated.medicationName}`,
        body: `Dr. prescribed ${validated.medicationName} (${validated.dosage}). Amount due: ETB ${totalPriceStr}. You can pay online right away or at the pharmacy counter.`,
        metadata: {
          prescriptionId: newRx.id,
          invoiceId: inv.id,
          totalPrice: totalPriceNum,
          currency: "ETB",
        },
      });
    }

    // 8. Auto-notify Doctor with expected payment
    await db.insert(pharmacyNotifications).values({
      tenantId: DEFAULT_TENANT_ID,
      queueItemId: queueItem.id,
      prescriptionId: newRx.id,
      recipientId: docId,
      recipientRole: "doctor",
      eventType: "prescription_signed",
      title: `✅ Rx Signed — ${validated.medicationName}`,
      body: `Prescription issued for ${patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}. Expected payment: ETB ${totalPriceStr} (Invoice: ${invoiceNum}). Patient notified automatically.`,
      metadata: {
        prescriptionId: newRx.id,
        totalPrice: totalPriceNum,
        currency: "ETB",
      },
    });

    // 9. Audit Log
    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      userId: docId,
      action: "PRESCRIPTION_SIGNED",
      entityType: "prescriptions",
      entityId: newRx.id,
      summary: `Clinician signed prescription: ${newRx.medicationName} ${newRx.dosage}. Total: ETB ${totalPriceStr}. Queue ID: ${queueItem.id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // 10. Real-Time Notification: Notify Pharmacists
    await dispatchNotification({
      category: "orders",
      type: "order_placed",
      title: `💊 New E-Prescription: ${validated.medicationName} ${validated.dosage}`,
      body: `Prescribed for ${patient ? `${patient.firstName} ${patient.lastName}` : "Patient"} (MRN: ${patient?.mrn || "N/A"}). Priority: ${(body.priority || "routine").toUpperCase()}. Awaiting verification.`,
      priority: body.priority === "urgent" || body.priority === "stat" ? "critical" : "normal",
      targetRole: "pharmacist",
      senderUserId: docId,
      actionUrl: `/pharmacy`,
      actionText: "Verify & Dispense",
      relatedEntityType: "prescriptions",
      relatedEntityId: newRx.id,
      metadata: { invoiceId: inv.id, totalPrice: totalPriceStr, prescriberId: docId },
    });

    // 11. Real-Time Notification: Waiting Payment Alert to Patient & Cashier
    await dispatchNotification({
      category: "billing",
      type: "payment_pending",
      title: `💳 Waiting Payment: Invoice #${invoiceNum}`,
      body: `Prescription for ${validated.medicationName} requires settlement: ETB ${totalPriceStr}. Patient: ${patient ? `${patient.firstName} ${patient.lastName}` : "Patient"}.`,
      priority: "high",
      recipientUserId: patient?.userId || undefined,
      senderUserId: docId,
      targetRole: "billing",
      actionUrl: `/billing/pos?invoiceId=${inv.id}`,
      actionText: `Pay ETB ${totalPriceStr}`,
      relatedEntityType: "invoices",
      relatedEntityId: inv.id,
      metadata: { invoiceNumber: invoiceNum, amount: totalPriceStr, prescriberId: docId },
    });

    // 12. Fire workflow engine — patient gets notified at every pipeline step
    executeWorkflowsForTrigger({
      triggerEvent: "PRESCRIPTION_SIGNED",
      patientId: validated.patientId,
      triggeredByUserId: docId,
      subjectLabel: `${validated.medicationName} ${validated.dosage}`,
      patientActionUrl: "/patient/dashboard",
      metadata: { prescriptionId: newRx.id, invoiceId: inv.id },
    }).catch((err) => console.error("[WorkflowExecutor:prescription]", err));

    return NextResponse.json(
      {
        success: true,
        data: newRx,
        invoice: inv,
        queueItem,
        pricing: {
          unitPrice: unitPriceNum,
          quantity: quantityNum,
          totalPrice: totalPriceNum,
          currency: "ETB",
        },
        message: "Prescription signed, priced, invoiced, and queued for pharmacy dispensing",
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
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create prescription" },
      { status: 500 }
    );
  }
}
