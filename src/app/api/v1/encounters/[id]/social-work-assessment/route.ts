import { NextRequest, NextResponse } from "next/server";
import { submitSocialWorkAssessment } from "@/lib/services/admission-workflow-service";
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
      socialWorkerId,
      housingStatus = "Stable",
      foodSecurity = "Secure",
      transportationAccess = "Public Transit / Family vehicle",
      supportSystemDescription = "Spouse and adult children assist with home activities.",
      recommendedCommunityResources = ["Municipal Transit Pass", "Community Nutrition Workshop"],
      dischargeBarriersIdentified = ["Requires prescription delivery assistance"],
    } = body;

    if (!patientId || !tenantId || !socialWorkerId) {
      return NextResponse.json({ error: "patientId, tenantId, and socialWorkerId required" }, { status: 400 });
    }

    const result = await submitSocialWorkAssessment({
      encounterId: params.id,
      patientId,
      tenantId,
      socialWorkerId,
      housingStatus,
      foodSecurity,
      transportationAccess,
      supportSystemDescription,
      recommendedCommunityResources,
      dischargeBarriersIdentified,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Social work assessment error:", error);
    return NextResponse.json({ error: "Failed to submit social work assessment" }, { status: 500 });
  }
}
