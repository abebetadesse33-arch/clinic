import { NextRequest, NextResponse } from "next/server";
import { WaitingRoomService } from "@/lib/services/waiting-room-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || req.headers.get("x-display-token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Display token is required" },
        { status: 400 }
      );
    }

    const updated = await WaitingRoomService.updateHeartbeat(token);

    return NextResponse.json({
      success: true,
      data: {
        receivedAt: new Date().toISOString(),
        displayId: updated?.id || null,
        name: updated?.name || null,
      },
    });
  } catch (error: any) {
    console.error("[DISPLAY HEARTBEAT ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to record heartbeat" },
      { status: 500 }
    );
  }
}
