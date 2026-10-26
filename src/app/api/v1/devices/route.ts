import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devices, rpmPrograms, deviceReadings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireRoles, STAFF_ROLES } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

// GET /api/v1/devices
export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const [deviceList, programs, readings] = await Promise.all([
      db
        .select()
        .from(devices)
        .where(patientId ? eq(devices.patientId, patientId) : undefined)
        .orderBy(desc(devices.createdAt)),
      db.select().from(rpmPrograms).orderBy(desc(rpmPrograms.createdAt)),
      db
        .select()
        .from(deviceReadings)
        .where(patientId ? eq(deviceReadings.patientId, patientId) : undefined)
        .orderBy(desc(deviceReadings.recordedAt))
        .limit(30),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        devices: deviceList,
        programs,
        recentReadings: readings,
      },
    });
  } catch (error: any) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch RPM devices" },
      { status: 500 }
    );
  }
}
