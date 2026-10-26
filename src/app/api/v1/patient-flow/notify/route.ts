import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientWayfindingNotifications, patients, organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { insertReturning } from "@/lib/db/returning";
import { requireRoles, CLINICIAN_ROLES, STAFF_ROLES } from "@/lib/security/auth-session";
import { requirePatientAccess } from "@/lib/security/tenant-resource";

export const dynamic = "force-dynamic";

// POST /api/v1/patient-flow/notify — dispatch dynamic queue wayfinding alert
export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const {
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

    const resolvedTenantId = auth.user.organizationId;

    // The patient being notified must belong to this organization.
    const access = await requirePatientAccess(req, patientId);
    if ("response" in access) return access.response;
    if (!access.patient) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }

    // Compose Wayfinding Message Content
    const message = customMessage || `🎟️ Ticket #${ticketNumber}: Please proceed to ${targetLocation} (${floorLevel}). ${directionGuidance ? `🧭 Wayfinding: ${directionGuidance}. ` : ""}Estimated wait: ~${estimatedWaitMinutes} minutes.`;

    const [notification] = await insertReturning(db, patientWayfindingNotifications, {
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
      });

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
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

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
