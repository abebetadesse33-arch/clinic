import { NextRequest, NextResponse } from "next/server";
import { submitNursingVitalsAndAssessment } from "@/lib/services/admission-workflow-service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      patientId,
      tenantId,
      nurseId,
      vitals,
      morseFallScore = 25,
      fallRiskCategory = "low",
      bradenPressureScore = 18,
      painScore = 2,
      nursingNotes = "Baseline vitals recorded. Patient oriented x3. Call light in reach.",
      aiSuggestedNursingDiagnoses,
    } = body;

    if (!patientId || !tenantId || !nurseId || !vitals) {
      return NextResponse.json({ error: "patientId, tenantId, nurseId, and vitals required" }, { status: 400 });
    }

    const result = await submitNursingVitalsAndAssessment({
      encounterId: params.id,
      patientId,
      tenantId,
      nurseId,
      vitals,
      morseFallScore,
      fallRiskCategory,
      bradenPressureScore,
      painScore,
      nursingNotes,
      aiSuggestedNursingDiagnoses,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Submit nursing assessment error:", error);
    return NextResponse.json({ error: "Failed to record nursing assessment" }, { status: 500 });
  }
}
