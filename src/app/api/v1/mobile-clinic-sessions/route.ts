import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mobileClinicSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── GET /api/v1/mobile-clinic-sessions ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  try {
    const sessions = await db
      .select()
      .from(mobileClinicSessions)
      .where(eq(mobileClinicSessions.tenantId, tenantId))
      .orderBy(desc(mobileClinicSessions.scheduledDate))
      .limit(50);

    return NextResponse.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error("GET mobile clinic sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// ─── POST /api/v1/mobile-clinic-sessions ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      sessionName,
      name,
      locationName,
      gpsLatitude,
      gpsLongitude,
      scheduledDate,
      sessionDate,
      services,
      assignedStaff,
    } = body;

    if (!tenantId || !locationName) {
      return NextResponse.json(
        { error: "tenantId and locationName required" },
        { status: 400 }
      );
    }

    const dateVal = scheduledDate || sessionDate || new Date().toISOString().split("T")[0];

    const [session] = await db
      .insert(mobileClinicSessions)
      .values({
        tenantId,
        name: name || sessionName || `Mobile Clinic – ${locationName}`,
        locationName,
        gpsLatitude: gpsLatitude ? String(gpsLatitude) : null,
        gpsLongitude: gpsLongitude ? String(gpsLongitude) : null,
        scheduledDate: dateVal,
        status: "in_progress",
        services: services || ["consultation", "point_of_care_lab", "pharmacy_dispensation"],
        assignedStaff: assignedStaff || [],
      })
      .returning();

    return NextResponse.json({ session });
  } catch (error) {
    console.error("POST mobile clinic session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
