import { NextRequest, NextResponse } from "next/server";
import { processPharmacistReview } from "@/lib/services/admission-workflow-service";
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
    const { patientId, tenantId, pharmacistId, reviews, pharmacistNotes } = body;

    if (!patientId || !tenantId || !pharmacistId || !reviews || !Array.isArray(reviews)) {
      return NextResponse.json(
        { error: "patientId, tenantId, pharmacistId, and reviews array required" },
        { status: 400 }
      );
    }

    const result = await processPharmacistReview({
      encounterId: params.id,
      patientId,
      tenantId,
      pharmacistId,
      reviews,
      pharmacistNotes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Pharmacist review error:", error);
    return NextResponse.json({ error: "Failed to process medication review" }, { status: 500 });
  }
}
