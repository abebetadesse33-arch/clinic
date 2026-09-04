import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId") || undefined;
    const queueType = searchParams.get("type") || searchParams.get("queueType") || undefined;
    const statusParam = searchParams.get("status");
    const statuses = statusParam ? statusParam.split(",") : ["waiting", "called", "in_service"];

    const list = await QueueService.getQueue({
      providerId,
      queueType,
      status: statuses,
    });

    return NextResponse.json({
      success: true,
      data: {
        queue: list,
        total: list.length,
        waitingCount: list.filter((q) => q.status === "waiting").length,
        inServiceCount: list.filter((q) => q.status === "in_service").length,
      },
    });
  } catch (err: any) {
    console.error("[Queue GET error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      caseId,
      providerId,
      queueType = "treat_me_now",
      priority = "routine",
      metadata = {},
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId is required" },
        { status: 400 }
      );
    }

    const entry = await QueueService.enqueue({
      patientId,
      caseId,
      providerId,
      queueType,
      priority,
      metadata,
    });

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (err: any) {
    console.error("[Queue POST error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add to queue" },
      { status: 500 }
    );
  }
}
