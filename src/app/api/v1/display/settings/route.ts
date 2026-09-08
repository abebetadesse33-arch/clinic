import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { waitingRoomDisplays } from "@/db/schema";
import { WaitingRoomService, DEFAULT_DISPLAY_SETTINGS } from "@/lib/services/waiting-room-service";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const displayId = searchParams.get("displayId");
    const tenantId = searchParams.get("tenantId");

    const display = await WaitingRoomService.getOrCreateDefaultDisplay(tenantId || undefined);

    return NextResponse.json({
      success: true,
      data: {
        displayId: display.id,
        name: display.name,
        location: display.location,
        token: display.displayToken,
        settings: {
          ...DEFAULT_DISPLAY_SETTINGS,
          ...(display.settings as any),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load display settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayId, name, location, settings } = body;

    let targetId = displayId;
    if (!targetId) {
      const defaultDisp = await WaitingRoomService.getOrCreateDefaultDisplay();
      targetId = defaultDisp.id;
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name) updatePayload.name = name;
    if (location) updatePayload.location = location;
    if (settings) updatePayload.settings = settings;

    const [updated] = await db
      .update(waitingRoomDisplays)
      .set(updatePayload)
      .where(eq(waitingRoomDisplays.id, targetId))
      .returning();

    if (updated) {
      WaitingRoomService.broadcast({
        type: "announcement",
        tenantId: updated.tenantId,
        displayId: updated.id,
        payload: { updatedSettings: updated.settings },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update display settings" },
      { status: 500 }
    );
  }
}
