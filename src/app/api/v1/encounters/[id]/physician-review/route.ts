import { NextRequest, NextResponse } from "next/server";
import { completePhysicianWorkup } from "@/lib/services/admission-workflow-service";
import { getOrderSetById } from "@/lib/services/clinical-order-sets";
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
      physicianId,
      primaryDiagnosis,
      clinicalNotes,
      orderSetId,
      selectedOrderItems,
      homeMedicationsReconciliation,
      carePlanGoals,
      carePlanInterventions,
    } = body;

    if (!patientId || !tenantId || !physicianId || !primaryDiagnosis) {
      return NextResponse.json(
        { error: "patientId, tenantId, physicianId, and primaryDiagnosis required" },
        { status: 400 }
      );
    }

    const orderSet = orderSetId ? getOrderSetById(orderSetId) : undefined;

    const result = await completePhysicianWorkup({
      encounterId: params.id,
      patientId,
      tenantId,
      physicianId,
      primaryDiagnosis,
      clinicalNotes: clinicalNotes || `Admission workup completed for ${primaryDiagnosis}.`,
      orderSet,
      selectedOrderItems,
      homeMedicationsReconciliation,
      carePlanGoals,
      carePlanInterventions,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Complete physician workup error:", error);
    return NextResponse.json({ error: "Failed to complete physician workup" }, { status: 500 });
  }
}
