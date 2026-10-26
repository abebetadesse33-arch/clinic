import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const entry = await QueueService.enqueue(body);
    return NextResponse.json({ success: true, data: entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to enqueue" }, { status: 500 });
  }
}
