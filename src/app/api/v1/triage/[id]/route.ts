import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [c] = await db
      .select({
        id: cases.id,
        caseId: cases.caseId,
        caseNumber: cases.caseNumber,
        chiefComplaint: cases.chiefComplaint,
        priority: cases.priority,
        severity: cases.severity,
        aiAnalysis: cases.aiAnalysis,
        symptoms: cases.symptoms,
        submittedAt: cases.submittedAt,
      })
      .from(cases)
      .where(eq(cases.caseId, id));

    if (!c) {
      return NextResponse.json(
        { success: false, error: `Triage record for case '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        caseId: c.caseId,
        caseNumber: c.caseNumber,
        chiefComplaint: c.chiefComplaint,
        priority: c.priority,
        triage: (c.aiAnalysis as any)?.triage || c.aiAnalysis,
        submittedAt: c.submittedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve triage record" },
      { status: 500 }
    );
  }
}
