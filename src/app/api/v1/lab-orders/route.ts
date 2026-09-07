import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labOrders, labTurnaround, auditLogs, patients, users, servicePricingCatalog } from "@/db/schema";
import { createLabOrderSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function getLabPreparationInstructions(testName: string): {
  fastingHours: number;
  fastingRequired: boolean;
  instructions: string;
  specimenType: string;
} {
  const lower = testName.toLowerCase();
  if (lower.includes("lipid") || lower.includes("cholesterol") || lower.includes("triglyceride")) {
    return {
      fastingHours: 12,
      fastingRequired: true,
      instructions: "Fasting required: 10-12 hours overnight fasting (water only). Avoid high-fat meals and alcohol 24h prior to sample collection.",
      specimenType: "Venous Blood (Gold SST Tube)",
    };
  }
  if (lower.includes("glucose") || lower.includes("sugar") || lower.includes("hba1c") || lower.includes("diabetes") || lower.includes("metabolic")) {
    return {
      fastingHours: 8,
      fastingRequired: true,
      instructions: "Fasting required: 8-10 hours fasting (water only). Please arrive for your blood draw in the morning before breakfast.",
      specimenType: "Venous Blood (Grey Fluoride/Lavender Tube)",
    };
  }
  if (lower.includes("urine") || lower.includes("urinalysis") || lower.includes("culture")) {
    return {
      fastingHours: 0,
      fastingRequired: false,
      instructions: "Clean-catch midstream morning urine sample required. Collect in the sterile container provided at the laboratory reception.",
      specimenType: "Midstream Urine Specimen",
    };
  }
  if (lower.includes("cbc") || lower.includes("blood count") || lower.includes("hemoglobin")) {
    return {
      fastingHours: 0,
      fastingRequired: false,
      instructions: "No fasting required. Maintain regular hydration prior to venous blood draw.",
      specimenType: "Whole Blood (Lavender EDTA Tube)",
    };
  }
  if (lower.includes("liver") || lower.includes("lft") || lower.includes("hepatic")) {
    return {
      fastingHours: 8,
      fastingRequired: true,
      instructions: "Fasting required: 8 hours fasting. Refrain from strenuous exercise and alcohol 24 hours prior to blood draw.",
      specimenType: "Venous Blood (SST Gold Tube)",
    };
  }
  return {
    fastingHours: 0,
    fastingRequired: false,
    instructions: "Routine specimen intake. Please report to the diagnostic laboratory collection desk (Room 102).",
    specimenType: "Clinical Diagnostic Specimen",
  };
}

// GET /api/v1/lab-orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId") || searchParams.get("id");

    if (orderId) {
      const rows = await db
        .select({
          id: labOrders.id,
          patientId: labOrders.patientId,
          encounterId: labOrders.encounterId,
          doctorId: labOrders.doctorId,
          testName: labOrders.testName,
          priority: labOrders.priority,
          clinicalReason: labOrders.clinicalReason,
          status: labOrders.status,
          price: labOrders.price,
          currency: labOrders.currency,
          paymentStatus: labOrders.paymentStatus,
          orderedAt: labOrders.orderedAt,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientMrn: patients.mrn,
          doctorName: users.fullName,
        })
        .from(labOrders)
        .leftJoin(patients, eq(labOrders.patientId, patients.id))
        .leftJoin(users, eq(labOrders.doctorId, users.id))
        .where(eq(labOrders.id, orderId));

      const single = rows[0]
        ? {
            ...rows[0],
            patientName: `${rows[0].patientFirstName || ""} ${rows[0].patientLastName || ""}`.trim() || "Patient",
          }
        : null;

      return NextResponse.json({ success: true, data: single });
    }

    let query = db
      .select({
        id: labOrders.id,
        patientId: labOrders.patientId,
        encounterId: labOrders.encounterId,
        doctorId: labOrders.doctorId,
        testName: labOrders.testName,
        priority: labOrders.priority,
        clinicalReason: labOrders.clinicalReason,
        status: labOrders.status,
        price: labOrders.price,
        currency: labOrders.currency,
        paymentStatus: labOrders.paymentStatus,
        orderedAt: labOrders.orderedAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        doctorName: users.fullName,
      })
      .from(labOrders)
      .leftJoin(patients, eq(labOrders.patientId, patients.id))
      .leftJoin(users, eq(labOrders.doctorId, users.id));

    if (patientId) {
      const data = await query
        .where(eq(labOrders.patientId, patientId))
        .orderBy(desc(labOrders.orderedAt));
      const mapped = data.map((d) => ({
        ...d,
        patientName: `${d.patientFirstName || ""} ${d.patientLastName || ""}`.trim() || "Patient",
      }));
      return NextResponse.json({ success: true, data: mapped });
    }

    if (status) {
      const data = await query
        .where(eq(labOrders.status, status as any))
        .orderBy(desc(labOrders.orderedAt));
      const mapped = data.map((d) => ({
        ...d,
        patientName: `${d.patientFirstName || ""} ${d.patientLastName || ""}`.trim() || "Patient",
      }));
      return NextResponse.json({ success: true, data: mapped });
    }

    const data = await query.orderBy(desc(labOrders.orderedAt)).limit(100);
    const mapped = data.map((d) => ({
      ...d,
      patientName: `${d.patientFirstName || ""} ${d.patientLastName || ""}`.trim() || "Patient",
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error("Error fetching lab orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab orders" },
      { status: 500 }
    );
  }
}

// POST /api/v1/lab-orders
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createLabOrderSchema.parse(body);

    // 1. STRICT AUTHENTICATION: Server session is authoritative; reject if unauthenticated
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Valid authenticated provider session required" },
        { status: 401 }
      );
    }

    // 2. CLINICAL DECISION SUPPORT (CDS): Prevent duplicate lab orders within 24 hours
    const { evaluateOrderCDS } = await import("@/lib/cds/order-cds-engine");
    const cdsResult = await evaluateOrderCDS({
      patientId: validated.patientId,
      testName: validated.testName,
      orderType: "laboratory",
    });

    if (cdsResult.hasConflict && cdsResult.severity === "hard_stop") {
      return NextResponse.json(
        { success: false, error: cdsResult.message, cds: cdsResult },
        { status: 422 }
      );
    }

    // 3. FETCH PATIENT & DOCTOR METADATA
    const [patient] = await db
      .select({
        id: patients.id,
        userId: patients.userId,
        firstName: patients.firstName,
        lastName: patients.lastName,
        mrn: patients.mrn,
        phone: patients.phone,
        email: patients.email,
      })
      .from(patients)
      .where(eq(patients.id, validated.patientId))
      .limit(1);

    const [doctor] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, sessionUserId))
      .limit(1);

    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
    const patientMrn = patient?.mrn || "MRN-PENDING";
    const doctorName = doctor?.fullName || "Attending Physician";

    // 4. CALCULATE PRICING FROM CATALOG
    let calculatedPrice = "450.00";
    let calculatedCurrency = "ETB";

    try {
      const catalogItems = await db
        .select()
        .from(servicePricingCatalog)
        .where(eq(servicePricingCatalog.category, "laboratory"));

      const matchedItem = catalogItems.find(
        (item) =>
          item.name.toLowerCase().includes(validated.testName.toLowerCase()) ||
          validated.testName.toLowerCase().includes(item.name.toLowerCase()) ||
          validated.testName.toLowerCase().includes(item.serviceCode.toLowerCase().replace("lab_", ""))
      );

      if (matchedItem) {
        calculatedPrice = matchedItem.basePrice;
        calculatedCurrency = matchedItem.currency || "ETB";
      }
    } catch (pricingErr) {
      console.warn("[LabOrders] Catalog pricing lookup fallback:", pricingErr);
    }

    // 5. DETERMINE CLINICAL PREPARATION & FASTING INSTRUCTIONS
    const prep = getLabPreparationInstructions(validated.testName);

    // 6. PERSIST LAB ORDER
    const [newOrder] = await db
      .insert(labOrders)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        encounterId: validated.encounterId || null,
        doctorId: sessionUserId,
        testName: validated.testName,
        priority: (validated.priority as "routine" | "urgent" | "stat") || "routine",
        clinicalReason: validated.clinicalReason || "Diagnostic clinical evaluation",
        status: "ordered",
        price: calculatedPrice,
        currency: calculatedCurrency,
        paymentStatus: "unpaid",
      })
      .returning();

    // Log TAT checkpoint
    await db.insert(labTurnaround).values({
      tenantId: DEFAULT_TENANT_ID,
      labOrderId: newOrder.id,
      step: "order_received",
      timestamp: new Date(),
    });

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "LAB_ORDERED",
      entityType: "lab_orders",
      entityId: newOrder.id,
      summary: `Clinician ${doctorName} (${sessionUserId}) placed diagnostic order for ${newOrder.testName} (${newOrder.priority}, ${calculatedPrice} ${calculatedCurrency}) for patient ${patientName} (${patientMrn})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // ─── 7. DISPATCH HIGH-PRECISION NOTIFICATIONS (DIRECT EVENT DEEP-LINKING) ───

    // (A) NOTIFY PATIENT (e.g., Yabsira Abebe): Calculated Payment Instructions & Direct Action
    const patientRecipientId = patient?.userId || patient?.id;
    if (patientRecipientId) {
      await dispatchNotification({
        category: "orders",
        type: "order_payment_required",
        title: `🔬 Lab Order & Payment Due: ${newOrder.testName} (${calculatedPrice} ${calculatedCurrency})`,
        body: `Dr. ${doctorName} ordered ${newOrder.testName}. Total fee: ${calculatedPrice} ${calculatedCurrency}. ${prep.instructions} Please settle payment to proceed with specimen collection.`,
        priority: newOrder.priority === "stat" ? "critical" : newOrder.priority === "urgent" ? "high" : "normal",
        recipientUserId: patientRecipientId,
        actionUrl: `/patient/orders?orderId=${newOrder.id}&action=pay&patientId=${validated.patientId}`,
        actionText: `Pay & View Instructions (${calculatedPrice} ${calculatedCurrency})`,
        relatedEntityType: "lab_orders",
        relatedEntityId: newOrder.id,
        metadata: {
          orderId: newOrder.id,
          testName: newOrder.testName,
          price: calculatedPrice,
          currency: calculatedCurrency,
          instructions: prep.instructions,
          fastingRequired: prep.fastingRequired,
          specimenType: prep.specimenType,
          doctorName,
        },
      });
    }

    // (B) NOTIFY LABORATORY DEPARTMENT (Biologists / Pathologists): Direct Specimen Intake Link
    await dispatchNotification({
      category: "orders",
      type: "order_placed",
      title: `🔬 Specimen Intake Required: ${newOrder.testName} [${newOrder.priority.toUpperCase()}]`,
      body: `Diagnostic test ordered for ${patientName} (${patientMrn}). Specimen: ${prep.specimenType}. Priority: ${newOrder.priority.toUpperCase()}. Fee: ${calculatedPrice} ${calculatedCurrency}.`,
      priority: newOrder.priority === "stat" ? "critical" : newOrder.priority === "urgent" ? "high" : "normal",
      targetRole: "lab_technician",
      senderUserId: sessionUserId,
      actionUrl: `/biologist?orderId=${newOrder.id}&patientId=${validated.patientId}&tab=orders`,
      actionText: `Intake Specimen (${patientName})`,
      relatedEntityType: "lab_orders",
      relatedEntityId: newOrder.id,
      metadata: {
        orderId: newOrder.id,
        patientId: validated.patientId,
        testName: newOrder.testName,
        specimenType: prep.specimenType,
        priority: newOrder.priority,
      },
    });

    // (C) NOTIFY CASHIER / BILLING: Pending POS Settlement
    await dispatchNotification({
      category: "billing",
      type: "pending_lab_charge",
      title: `💳 Pending Lab Fee: ${patientName} - ${calculatedPrice} ${calculatedCurrency}`,
      body: `Unpaid diagnostic order for ${newOrder.testName} (${patientMrn}). Ready for cashier settlement.`,
      priority: "normal",
      targetRole: "cashier",
      senderUserId: sessionUserId,
      actionUrl: `/billing/pos?patientId=${validated.patientId}&orderId=${newOrder.id}`,
      actionText: `Collect Payment (${calculatedPrice} ${calculatedCurrency})`,
      relatedEntityType: "lab_orders",
      relatedEntityId: newOrder.id,
      metadata: {
        orderId: newOrder.id,
        patientId: validated.patientId,
        amount: calculatedPrice,
        currency: calculatedCurrency,
      },
    });

    // (D) NOTIFY ORDERING PHYSICIAN: Confirmation of Routing
    await dispatchNotification({
      category: "orders",
      type: "order_confirmation_doctor",
      title: `✅ Diagnostic Order Placed: ${newOrder.testName}`,
      body: `Order placed for ${patientName} (${patientMrn}). Payment instructions sent to patient; routed to Lab for accessioning.`,
      priority: "low",
      recipientUserId: sessionUserId,
      actionUrl: validated.encounterId
        ? `/encounters/${validated.encounterId}`
        : `/patients/${validated.patientId}?tab=orders&orderId=${newOrder.id}`,
      actionText: "View Order in Chart",
      relatedEntityType: "lab_orders",
      relatedEntityId: newOrder.id,
    });

    // Fire workflow engine for patient portal with explicit deep link
    executeWorkflowsForTrigger({
      triggerEvent: "LAB_ORDER_SUBMITTED",
      patientId: newOrder.patientId,
      triggeredByUserId: sessionUserId,
      subjectLabel: `${newOrder.testName} [${newOrder.priority.toUpperCase()}]`,
      patientActionUrl: `/patient/orders?orderId=${newOrder.id}&action=pay&patientId=${validated.patientId}`,
      metadata: {
        labOrderId: newOrder.id,
        priority: newOrder.priority,
        price: calculatedPrice,
        currency: calculatedCurrency,
        instructions: prep.instructions,
      },
    }).catch((err) => console.error("[WorkflowExecutor:lab-order]", err));

    return NextResponse.json(
      {
        success: true,
        data: newOrder,
        pricing: { price: calculatedPrice, currency: calculatedCurrency },
        instructions: prep,
        message: `Diagnostic lab order submitted. Notification and payment instructions dispatched to ${patientName} and Laboratory.`,
        cds: cdsResult.hasConflict ? cdsResult : undefined,
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
    console.error("Error creating lab order:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create lab order" },
      { status: 500 }
    );
  }
}
