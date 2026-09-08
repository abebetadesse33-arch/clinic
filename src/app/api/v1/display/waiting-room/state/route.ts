import { NextRequest, NextResponse } from "next/server";
import { WaitingRoomService } from "@/lib/services/waiting-room-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const displayId = searchParams.get("displayId") || undefined;
    const token = searchParams.get("token") || req.headers.get("x-display-token") || undefined;
    const tenantId = searchParams.get("tenantId") || undefined;

    const state = await WaitingRoomService.getDisplayState({
      displayId,
      token,
      tenantId,
    });

    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    console.error("[WAITING ROOM STATE GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load waiting room state" },
      { status: 500 }
    );
  }
}
