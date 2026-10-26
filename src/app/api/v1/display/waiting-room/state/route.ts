import { NextRequest, NextResponse } from "next/server";
import { WaitingRoomService } from "@/lib/services/waiting-room-service";
import { authorizeDisplay } from "@/lib/security/display-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await authorizeDisplay(req);
  if ("response" in access) return access.response;

  try {
    const displayId = access.displayId || undefined;
    const token = access.token || undefined;
    const tenantId = access.tenantId;

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
