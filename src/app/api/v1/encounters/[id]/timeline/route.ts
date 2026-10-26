import { NextRequest, NextResponse } from "next/server";
import { getEncounterAdmissionTimeline } from "@/lib/services/admission-workflow-service";
import { requireRoles, STAFF_ROLES } from "@/lib/security/auth-session";
import { assertEncounterInTenant } from "@/lib/security/tenant-resource";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(_req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  const denied = await assertEncounterInTenant(params.id, auth.user.organizationId);
  if (denied) return denied;

  try {
    const timeline = await getEncounterAdmissionTimeline(params.id);

    if (!timeline) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, timeline });
  } catch (error) {
    console.error("Get admission timeline error:", error);
    return NextResponse.json({ error: "Failed to fetch admission timeline" }, { status: 500 });
  }
}
