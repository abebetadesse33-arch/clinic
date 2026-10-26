import { NextRequest, NextResponse } from "next/server";
import { submitTherapyAssessment } from "@/lib/services/admission-workflow-service";
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
      therapistId,
      therapyType = "physiotherapy",
      barthelIndexScore,
      bergBalanceScore,
      mobilityStatus = "Independent with Cane",
      rehabGoals = "Achieve unassisted ambulation for 150 meters and safe stair climbing.",
      exerciseRegimenSummary = "Quadriceps isometric strengthening, seated balance progression, active ankle pumps.",
    } = body;

    if (!patientId || !tenantId || !therapistId) {
      return NextResponse.json({ error: "patientId, tenantId, and therapistId required" }, { status: 400 });
    }

    const result = await submitTherapyAssessment({
      encounterId: params.id,
      patientId,
      tenantId,
      therapistId,
      therapyType,
      barthelIndexScore,
      bergBalanceScore,
      mobilityStatus,
      rehabGoals,
      exerciseRegimenSummary,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Therapy assessment error:", error);
    return NextResponse.json({ error: "Failed to submit therapy assessment" }, { status: 500 });
  }
}
