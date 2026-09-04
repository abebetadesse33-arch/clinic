import { NextRequest, NextResponse } from "next/server";
import { CentralStateMachineService } from "@/lib/services/central-state-machine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, encounterId, eventName, actorId, actorRole, payload, correlationId } = body;

    if (!tenantId || !encounterId || !eventName) {
      return NextResponse.json(
        { error: "tenantId, encounterId, and eventName are required" },
        { status: 400 }
      );
    }

    const result = await CentralStateMachineService.dispatchEvent({
      tenantId,
      encounterId,
      eventName,
      actorId,
      actorRole: actorRole || "doctor",
      payload: payload || {},
      correlationId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("State machine event error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch state machine event" },
      { status: 400 }
    );
  }
}
