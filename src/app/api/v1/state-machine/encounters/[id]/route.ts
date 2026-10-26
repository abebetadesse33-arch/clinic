import { NextRequest, NextResponse } from "next/server";
import { CentralStateMachineService } from "@/lib/services/central-state-machine";
import { requireRoles, STAFF_ROLES } from "@/lib/security/auth-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(_req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const matrix = await CentralStateMachineService.getEncounterStateMatrix(params.id);
    return NextResponse.json({ success: true, matrix });
  } catch (error: any) {
    console.error("Fetch state matrix error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch state machine matrix" },
      { status: 500 }
    );
  }
}
