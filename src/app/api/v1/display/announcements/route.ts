import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { displayAnnouncements } from "@/db/schema";
import { WaitingRoomService } from "@/lib/services/waiting-room-service";
import { desc, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || DEFAULT_TENANT_ID;

    const list = await db
      .select()
      .from(displayAnnouncements)
      .where(
        and(
          eq(displayAnnouncements.tenantId, tenantId),
          eq(displayAnnouncements.isActive, true)
        )
      )
      .orderBy(desc(displayAnnouncements.createdAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      type = "info",
      audience = "all",
      displayId,
      tenantId = DEFAULT_TENANT_ID,
      startsAt,
      endsAt,
    } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message content is required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(displayAnnouncements)
      .values({
        tenantId,
        displayId: displayId || null,
        message: message.trim(),
        type,
        audience,
        isActive: true,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
      })
      .returning();

    // Broadcast announcement event to active displays
    WaitingRoomService.broadcast({
      type: type === "critical" ? "emergency_override" : "announcement",
      tenantId,
      displayId: displayId || undefined,
      payload: created,
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(displayAnnouncements)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(displayAnnouncements.id, id))
      .returning();

    if (updated) {
      WaitingRoomService.broadcast({
        type: "announcement",
        tenantId: updated.tenantId,
        payload: { deactivatedId: id },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
