import { NextRequest, NextResponse } from "next/server";
import { submitDietitianAssessment } from "@/lib/services/admission-workflow-service";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";
import { assertEncounterInTenant } from "@/lib/security/tenant-resource";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  const denied = await assertEncounterInTenant(params.id, auth.user.organizationId);
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      patientId,
      tenantId,
      dietitianId,
      nutritionalRiskScore = "moderate",
      dailyCalorieTarget = 1800,
      proteinTargetGrams = 75,
      sodiumLimitMg = 2000,
      dietType = "Low Sodium Diabetic Renal",
      mealPlanSummary = "Structured 3-meal plan with low glycemic index carbohydrates, leafy greens, and lean protein.",
    } = body;

    if (!patientId || !tenantId || !dietitianId) {
      return NextResponse.json({ error: "patientId, tenantId, and dietitianId required" }, { status: 400 });
    }

    const result = await submitDietitianAssessment({
      encounterId: params.id,
      patientId,
      tenantId,
      dietitianId,
      nutritionalRiskScore,
      dailyCalorieTarget,
      proteinTargetGrams,
      sodiumLimitMg,
      dietType,
      mealPlanSummary,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Nutrition assessment error:", error);
    return NextResponse.json({ error: "Failed to submit nutrition assessment" }, { status: 500 });
  }
}
