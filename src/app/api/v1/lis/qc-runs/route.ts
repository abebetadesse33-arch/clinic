import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labQcRuns, auditLogs } from "@/db/schema";
import { createLabQcRunSchema } from "@/lib/validations/schemas";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// POST /api/v1/lis/qc-runs - Record QC Run & Evaluate Tolerance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createLabQcRunSchema.parse(body);

    const zScore = (validated.measuredValue - validated.expectedMean) / validated.standardDeviation;
    const passed = Math.abs(zScore) <= 2.0;

    const [newRun] = await db
      .insert(labQcRuns)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        instrumentId: validated.instrumentId,
        analyte: validated.analyte,
        level: validated.level,
        measuredValue: validated.measuredValue.toString(),
        expectedMean: validated.expectedMean.toString(),
        standardDeviation: validated.standardDeviation.toString(),
        referenceRangeLow: validated.referenceRangeLow.toString(),
        referenceRangeHigh: validated.referenceRangeHigh.toString(),
        passed,
        zScore: zScore.toFixed(2),
        performedBy: "11111111-1111-1111-1111-111111111108",
        notes: validated.notes || (passed ? "QC In Control (Westgard 1:2s passed)" : "QC Out of Control: Lockout Warning"),
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "LAB_QC_LOGGED",
      entityType: "lab_qc_runs",
      entityId: newRun.id,
      summary: `Logged QC for ${newRun.analyte} (${newRun.level}): Value ${newRun.measuredValue}, Z-Score ${newRun.zScore} (${passed ? "PASSED" : "FAILED"})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      {
        success: true,
        data: newRun,
        message: passed ? "QC Run Passed within 2SD" : "QC Run Failed: Instrument flagged",
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
    console.error("Error logging QC run:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log QC run" },
      { status: 500 }
    );
  }
}
