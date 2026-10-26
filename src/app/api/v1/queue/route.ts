import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { requireRoles, STAFF_ROLES, CLINICIAN_ROLES } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

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
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const {
      patientId,
      caseId,
      providerId,
      queueType = "treat_me_now",
      priority = "routine",
      queueNumber,
      servicePoint,
      department,
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
      queueNumber,
      servicePoint,
      department,
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
