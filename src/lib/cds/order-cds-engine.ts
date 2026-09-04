import { db } from "@/db";
import { clinicalOrders, patients, labOrders } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export interface CDSEvaluationResult {
  hasConflict: boolean;
  severity: "none" | "soft_stop" | "hard_stop";
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Pre-submission Clinical Decision Support (CDS) evaluator.
 * Prevents redundant blood draws, duplicate diagnostic tests, and contraindicated interventions.
 */
export async function evaluateOrderCDS(params: {
  patientId: string;
  testName: string;
  orderType?: string;
}): Promise<CDSEvaluationResult> {
  const { patientId, testName, orderType = "laboratory" } = params;

  // 1. DUPLICATE ORDER CHECK (Within the last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check clinicalOrders
  const [recentOrder] = await db
    .select({
      id: clinicalOrders.id,
      createdAt: clinicalOrders.createdAt,
      status: clinicalOrders.status,
    })
    .from(clinicalOrders)
    .where(
      and(
        eq(clinicalOrders.patientId, patientId),
        eq(clinicalOrders.clinicalIndication, testName),
        gt(clinicalOrders.createdAt, twentyFourHoursAgo)
      )
    )
    .limit(1);

  if (recentOrder && recentOrder.status !== "cancelled") {
    return {
      hasConflict: true,
      severity: "soft_stop",
      message: `Duplicate Order Alert: '${testName}' was already ordered for this patient on ${recentOrder.createdAt.toLocaleDateString()} ${recentOrder.createdAt.toLocaleTimeString()}. Documented clinical rationale is required to proceed.`,
      details: { existingOrderId: recentOrder.id, orderedAt: recentOrder.createdAt },
    };
  }

  // Also check legacy labOrders table for backward safety
  const [legacyDuplicate] = await db
    .select({
      id: labOrders.id,
      orderedAt: labOrders.orderedAt,
      status: labOrders.status,
    })
    .from(labOrders)
    .where(
      and(
        eq(labOrders.patientId, patientId),
        eq(labOrders.testName, testName),
        gt(labOrders.orderedAt, twentyFourHoursAgo)
      )
    )
    .limit(1);

  if (legacyDuplicate && legacyDuplicate.status !== "cancelled") {
    return {
      hasConflict: true,
      severity: "soft_stop",
      message: `Duplicate Order Alert: '${testName}' is already pending in the laboratory since ${legacyDuplicate.orderedAt.toLocaleDateString()} ${legacyDuplicate.orderedAt.toLocaleTimeString()}. Please review existing diagnostic results before re-ordering.`,
      details: { existingOrderId: legacyDuplicate.id, orderedAt: legacyDuplicate.orderedAt },
    };
  }

  // 2. PATIENT ALLERGY CROSS-CHECK (If medication/pharmacy order)
  if (orderType === "pharmacy") {
    const [patient] = await db
      .select({ allergies: patients.allergies })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (patient?.allergies && Array.isArray(patient.allergies)) {
      const normalizedTest = testName.toLowerCase();
      const matchedAllergy = patient.allergies.find((a: any) =>
        a?.substance && normalizedTest.includes(String(a.substance).toLowerCase())
      );

      if (matchedAllergy) {
        return {
          hasConflict: true,
          severity: matchedAllergy.severity === "anaphylactic" || matchedAllergy.severity === "severe" ? "hard_stop" : "soft_stop",
          message: `ALLERGY WARNING: Patient has documented allergy to '${matchedAllergy.substance}' (Severity: ${matchedAllergy.severity || "Unknown"}).`,
          details: { allergy: matchedAllergy },
        };
      }
    }
  }

  return { hasConflict: false, severity: "none" };
}
