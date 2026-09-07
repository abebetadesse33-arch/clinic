import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { imagingReports, imagingStudies, auditLogs } from "@/db/schema";
import { createImagingReportSchema } from "@/lib/validations/schemas";
import { eq } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// POST /api/v1/ris/imaging-reports
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createImagingReportSchema.parse(body);

    const [newReport] = await db
      .insert(imagingReports)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        studyId: validated.studyId,
        technique: validated.technique,
        findings: validated.findings,
        impression: validated.impression,
        recommendations: validated.recommendations,
        signedBy: "11111111-1111-1111-1111-111111111101",
        signedAt: new Date(),
        peerReviewStatus: "none",
      })
      .returning();

    // Update study status to signed
    await db
      .update(imagingStudies)
      .set({
        status: "signed",
        isCriticalFinding: validated.isCriticalFinding,
      })
      .where(eq(imagingStudies.id, validated.studyId));

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "IMAGING_REPORT_SIGNED",
      entityType: "imaging_reports",
      entityId: newReport.id,
      summary: `Radiologist signed imaging report for Study ${validated.studyId}. Critical finding: ${validated.isCriticalFinding ? "YES" : "NO"}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newReport, message: "Imaging report signed and finalized" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating imaging report:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit imaging report" },
      { status: 500 }
    );
  }
}
