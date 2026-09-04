import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updated = await QueueService.callPatient(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to call patient" }, { status: 500 });
  }
}
