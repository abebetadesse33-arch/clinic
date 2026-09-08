import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queueId, status, servicePoint } = body;

    if (!queueId || !status) {
      return NextResponse.json(
        { success: false, error: "queueId and status are required" },
        { status: 400 }
      );
    }

    const updated = await QueueService.updateStatus(queueId, status, servicePoint);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Queue entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("[QUEUE UPDATE STATUS ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update queue status" },
      { status: 500 }
    );
  }
}
