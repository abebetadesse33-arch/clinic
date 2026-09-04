import { db } from "@/db";
import { healthInsights } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export interface GenerateInsightsInput {
  tenantId: string;
  patientId: string;
  patientName: string;
  vitalsHistory?: { date: string; systolicBP: number; diastolicBP: number; bloodGlucose?: number }[];
  missedAppointmentsCount?: number;
  lastHbA1cDate?: string;
  lastHbA1cValue?: number;
  medicationAdherenceRate?: number; // 0-100%
  hasKidneyScreeningPastYear?: boolean;
}

export interface GeneratedInsight {
  type: "risk" | "trend" | "care_gap" | "adherence" | "drug_safety";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  suggestedAction: string;
  actionType: "order_lab" | "adjust_medication" | "schedule_visit" | "lifestyle_nudge" | "care_manager_outreach";
}

export async function evaluateProactiveHealthInsights(
  input: GenerateInsightsInput
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];

  // 1. Blood pressure trend analysis (rising trend over 3 measurements)
  if (input.vitalsHistory && input.vitalsHistory.length >= 3) {
    const recent = input.vitalsHistory.slice(-3);
    const isRising = recent[0].systolicBP < recent[1].systolicBP && recent[1].systolicBP < recent[2].systolicBP;
    const currentHigh = recent[recent.length - 1].systolicBP >= 140;

    if (isRising && currentHigh) {
      insights.push({
        type: "trend",
        severity: "warning",
        title: "Upward Blood Pressure Trajectory Detected",
        message: `${input.patientName}'s systolic blood pressure has trended upward consecutively across recent readings (${recent.map((r) => r.systolicBP).join(" → ")} mmHg). Current reading exceeds Stage 2 hypertension threshold.`,
        suggestedAction: "Schedule clinical follow-up for medication titration and dietary sodium review.",
        actionType: "adjust_medication",
      });
    }
  }

  // 2. Care Gap: Missing Annual Diabetic Kidney Screening
  if (input.lastHbA1cValue && input.lastHbA1cValue >= 6.5 && !input.hasKidneyScreeningPastYear) {
    insights.push({
      type: "care_gap",
      severity: "warning",
      title: "HEDIS Care Gap: Annual Diabetic Nephropathy Screening Due",
      message: "No urine albumin-to-creatinine ratio (uACR) test recorded in the past 12 months for diagnosed diabetes.",
      suggestedAction: "Order Urine Albumin/Creatinine Ratio and Serum Creatinine/eGFR panel.",
      actionType: "order_lab",
    });
  }

  // 3. Medication Non-Adherence Risk
  if (input.medicationAdherenceRate !== undefined && input.medicationAdherenceRate < 80) {
    insights.push({
      type: "adherence",
      severity: "critical",
      title: "Elevated Non-Adherence Risk (PDC < 80%)",
      message: `Pharmacy refill tracking indicates Proportion of Days Covered (PDC) is ${input.medicationAdherenceRate}%. Patient is at high risk of glycemic/vascular rebound.`,
      suggestedAction: "Assign care coordinator for barrier discovery outreach (cost, side effects, forgetfulness).",
      actionType: "care_manager_outreach",
    });
  }

  // 4. Repeated Missed Appointments
  if (input.missedAppointmentsCount && input.missedAppointmentsCount >= 2) {
    insights.push({
      type: "risk",
      severity: "warning",
      title: "Engagement Loss Risk: 2+ Missed Visits",
      message: `${input.patientName} has missed ${input.missedAppointmentsCount} scheduled appointments. High likelihood of care plan discontinuation.`,
      suggestedAction: "Send automated SMS rebooking prompt and offer telehealth / home mobile clinic option.",
      actionType: "schedule_visit",
    });
  }

  // Persist new insights to database if any
  for (const ins of insights) {
    try {
      await db.insert(healthInsights).values({
        tenantId: input.tenantId,
        patientId: input.patientId,
        type: ins.type,
        severity: ins.severity,
        title: ins.title,
        message: ins.message,
        suggestedAction: ins.suggestedAction,
        actionType: ins.actionType,
        status: "new",
      });
    } catch (e) {
      console.error("Failed to persist health insight:", e);
    }
  }

  return insights;
}

export async function getPatientActiveInsights(patientId: string) {
  return db
    .select()
    .from(healthInsights)
    .where(and(eq(healthInsights.patientId, patientId), eq(healthInsights.status, "new")))
    .orderBy(desc(healthInsights.createdAt))
    .limit(20);
}
