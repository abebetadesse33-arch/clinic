import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const { id } = params;
    const updated = await QueueService.completeConsultation(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to complete consultation" }, { status: 500 });
  }
}
