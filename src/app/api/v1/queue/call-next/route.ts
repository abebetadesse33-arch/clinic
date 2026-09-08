import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      queueId,
      servicePoint = "Consultation Room 1",
      department,
      providerId,
      tenantId,
    } = body;

    const callerUserId = await getAuthenticatedSessionUserId(req) || undefined;

    let result;
    if (queueId) {
      // Call specific patient by ID
      result = await QueueService.callPatient(queueId, {
        servicePoint,
        calledByUserId: callerUserId,
        providerId,
      });
    } else {
      // Automatically call next patient in line
      result = await QueueService.callNextInQueue({
        servicePoint,
        department,
        providerId,
        callerUserId,
        tenantId,
      });
    }

    if (!result) {
      return NextResponse.json({
        success: false,
        message: "No waiting patients currently in the specified queue.",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Patient called to ${servicePoint}`,
    });
  } catch (error: any) {
    console.error("[CALL NEXT QUEUE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to call patient" },
      { status: 500 }
    );
  }
}
