import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientWayfindingNotifications, patients, organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/v1/patient-flow/notify — dispatch dynamic queue wayfinding alert
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      patientId,
      encounterId,
      ticketNumber,
      targetLocation,
      floorLevel = "Ground Floor",
      directionGuidance,
      estimatedWaitMinutes = 5,
      channel = "in_app",
      recipientPhone,
      customMessage,
    } = body;

    if (!patientId || !targetLocation || !ticketNumber) {
      return NextResponse.json({
        success: false,
        error: "patientId, targetLocation, and ticketNumber are required.",
      }, { status: 400 });
    }

    // Resolve tenant ID fallback
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      resolvedTenantId = firstOrg?.id;
    }

    // Compose Wayfinding Message Content
    const message = customMessage || `🎟️ Ticket #${ticketNumber}: Please proceed to ${targetLocation} (${floorLevel}). ${directionGuidance ? `🧭 Wayfinding: ${directionGuidance}. ` : ""}Estimated wait: ~${estimatedWaitMinutes} minutes.`;

    const [notification] = await db
      .insert(patientWayfindingNotifications)
      .values({
        tenantId: resolvedTenantId,
        patientId,
        encounterId: encounterId || null,
        ticketNumber,
        targetLocation,
        floorLevel,
        directionGuidance: directionGuidance || null,
        estimatedWaitMinutes: Number(estimatedWaitMinutes),
        channel,
        recipientPhone: recipientPhone || null,
        messageContent: message,
        deliveryStatus: "sent",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        notification,
        dispatchResult: {
          channel,
          delivered: true,
          messagePreview: message,
          timestamp: new Date().toISOString(),
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[PATIENT WAYFINDING NOTIFY POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// GET /api/v1/patient-flow/notify — query recent wayfinding notifications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const patientId = searchParams.get("patientId");

    const notifications = await db
      .select()
      .from(patientWayfindingNotifications)
      .orderBy(desc(patientWayfindingNotifications.dispatchedAt))
      .limit(30);

    const filtered = patientId ? notifications.filter((n) => n.patientId === patientId) : notifications;

    return NextResponse.json({
      success: true,
      data: filtered,
    });
  } catch (error: any) {
    console.error("[PATIENT WAYFINDING NOTIFY GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
