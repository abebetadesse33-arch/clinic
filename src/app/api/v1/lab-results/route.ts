import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labResults, labOrders, labTurnaround, auditLogs, patients, users } from "@/db/schema";
import { createLabResultSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/lab-results
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (patientId) {
      const data = await db
        .select()
        .from(labResults)
        .where(eq(labResults.patientId, patientId))
        .orderBy(desc(labResults.performedAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(labResults)
      .orderBy(desc(labResults.performedAt))
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching lab results:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab results" },
      { status: 500 }
    );
  }
}

// POST /api/v1/lab-results
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createLabResultSchema.parse(body);
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: authenticated laboratory session required" },
        { status: 401 }
      );
    }

    const numVal = parseFloat(validated.value);
    let isAbnormal = validated.isAbnormal || false;
    let interpretation = validated.interpretation || "Normal";

    if (!isNaN(numVal)) {
      if (validated.referenceRangeHigh !== undefined && numVal > validated.referenceRangeHigh) {
        isAbnormal = true;
        interpretation = "High";
      } else if (validated.referenceRangeLow !== undefined && numVal < validated.referenceRangeLow) {
        isAbnormal = true;
        interpretation = "Low";
      }
    }

    const [newResult] = await db
      .insert(labResults)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        testName: validated.testName,
        category: validated.category,
        value: validated.value,
        unit: validated.unit,
        referenceRangeLow: validated.referenceRangeLow?.toString(),
        referenceRangeHigh: validated.referenceRangeHigh?.toString(),
        isAbnormal,
        interpretation,
        performedAt: new Date(),
      })
      .returning();

    // 1. Fetch Patient and linked Lab Order Details
    const [patient] = await db
      .select({
        id: patients.id,
        userId: patients.userId,
        firstName: patients.firstName,
        lastName: patients.lastName,
        mrn: patients.mrn,
      })
      .from(patients)
      .where(eq(patients.id, validated.patientId))
      .limit(1);

    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
    const patientMrn = patient?.mrn || "MRN-PENDING";

    let linkedDoctorId: string | null = null;
    let linkedEncounterId: string | null = null;

    // If linked to an order, update order status to completed and log turnaround
    if (validated.labOrderId) {
      const [order] = await db
        .update(labOrders)
        .set({ status: "completed" })
        .where(eq(labOrders.id, validated.labOrderId))
        .returning();

      if (order) {
        linkedDoctorId = order.doctorId;
        linkedEncounterId = order.encounterId;
      }

      await db.insert(labTurnaround).values({
        tenantId: DEFAULT_TENANT_ID,
        labOrderId: validated.labOrderId,
        step: "result_released",
        timestamp: new Date(),
      });
    }

    // 2. Audit Logging
    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      userId: sessionUserId,
      action: "LAB_RESULT_ENTERED",
      entityType: "lab_results",
      entityId: newResult.id,
      summary: `Entered lab result: ${newResult.testName} = ${newResult.value} ${newResult.unit} (${interpretation}) for patient ${patientName} (${patientMrn})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // ─── 3. DISPATCH TARGETED RESULT NOTIFICATIONS WITH DIRECT DEEP LINKS ───

    // (A) NOTIFY PATIENT: Direct deep link to the verified lab report
    const patientRecipientId = patient?.userId || patient?.id;
    if (patientRecipientId) {
      await dispatchNotification({
        category: "orders",
        type: "lab_result_ready",
        title: `${isAbnormal ? "⚠️ Diagnostic Result Available: " : "📋 Lab Result Verified: "}${newResult.testName}`,
        body: `Your results for ${newResult.testName} are ready: ${newResult.value} ${newResult.unit} (${interpretation}). Ref: ${newResult.referenceRangeLow || "—"} - ${newResult.referenceRangeHigh || "—"}. Reviewed by laboratory.`,
        priority: isAbnormal ? "high" : "normal",
        recipientUserId: patientRecipientId,
        actionUrl: `/patient/orders?orderId=${validated.labOrderId || newResult.id}&resultId=${newResult.id}&view=result`,
        actionText: `View Test Results & Notes`,
        relatedEntityType: "lab_results",
        relatedEntityId: newResult.id,
        senderUserId: sessionUserId,
        metadata: {
          resultId: newResult.id,
          orderId: validated.labOrderId,
          testName: newResult.testName,
          value: newResult.value,
          unit: newResult.unit,
          interpretation,
          isAbnormal,
        },
      });
    }

    // (B) NOTIFY ORDERING / ATTENDING PHYSICIAN: Direct deep link to review findings
    if (linkedDoctorId) {
      await dispatchNotification({
        category: "orders",
        type: "lab_result_physician_alert",
        title: `${isAbnormal ? "🚨 ABNORMAL LAB: " : "📋 Result Ready: "}${newResult.testName} (${patientName})`,
        body: `Result: ${newResult.value} ${newResult.unit} [${interpretation}]. Ref: ${newResult.referenceRangeLow || "—"} - ${newResult.referenceRangeHigh || "—"}. Patient: ${patientName} (${patientMrn}).`,
        priority: isAbnormal ? "critical" : "normal",
        recipientUserId: linkedDoctorId,
        actionUrl: linkedEncounterId
          ? `/encounters/${linkedEncounterId}`
          : `/patients/${validated.patientId}?tab=labs&orderId=${validated.labOrderId || ""}&resultId=${newResult.id}`,
        actionText: `Review & Acknowledge Result`,
        relatedEntityType: "lab_results",
        relatedEntityId: newResult.id,
        senderUserId: sessionUserId,
        metadata: {
          resultId: newResult.id,
          orderId: validated.labOrderId,
          patientId: validated.patientId,
          testName: newResult.testName,
          value: newResult.value,
          unit: newResult.unit,
          interpretation,
          isAbnormal,
        },
      });
    }

    // (C) NOTIFY BIOLOGIST / LAB DEPT: Record Archival
    await dispatchNotification({
      category: "orders",
      type: "lab_result_archived",
      title: `✅ Result Verified & Released: ${newResult.testName}`,
      body: `Result published for ${patientName} (${patientMrn}). Turnaround checkpoint logged.`,
      priority: "low",
      targetRole: "lab_technician",
      senderUserId: sessionUserId,
      actionUrl: `/biologist?orderId=${validated.labOrderId || ""}&tab=results`,
      actionText: "View Archival Log",
      relatedEntityType: "lab_results",
      relatedEntityId: newResult.id,
    });

    // Fire workflow engine for patient portal
    executeWorkflowsForTrigger({
      triggerEvent: isAbnormal ? "LAB_RESULT_CRITICAL" : "LAB_RESULT_READY",
      patientId: validated.patientId,
      triggeredByUserId: sessionUserId,
      subjectLabel: `${newResult.testName}: ${newResult.value} ${newResult.unit} (${interpretation})`,
      patientActionUrl: `/patient/orders?orderId=${validated.labOrderId || newResult.id}&resultId=${newResult.id}&view=result`,
      metadata: {
        resultId: newResult.id,
        orderId: validated.labOrderId,
        testName: newResult.testName,
        value: newResult.value,
        unit: newResult.unit,
        interpretation,
        isAbnormal,
        authenticatedSessionId: sessionUserId,
      },
    }).catch((err) => console.error("[WorkflowExecutor:lab-result]", err));

    return NextResponse.json(
      { success: true, data: newResult, message: "Lab result entered, verified, and notifications dispatched" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating lab result:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to enter lab result" },
      { status: 500 }
    );
  }
}
