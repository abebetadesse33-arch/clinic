import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicLocations, auditLogs } from "@/db/schema";
import { desc, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/locations - List all clinic branches (active & inactive)
export async function GET() {
  try {
    const list = await db
      .select()
      .from(clinicLocations)
      .orderBy(desc(clinicLocations.isMain), desc(clinicLocations.isActive), asc(clinicLocations.name));

    return NextResponse.json({
      success: true,
      data: list,
      total: list.length,
    });
  } catch (error: any) {
    console.error("Error in admin locations GET:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/locations - Add and integrate a new clinic location
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      branchType = "branch",
      neighborhood,
      city = "Debre Birhan",
      region = "Amhara, Ethiopia",
      address,
      latitude,
      longitude,
      phone,
      email = "info@ninimed.org",
      hours = "Mon–Sat: 8:00 AM – 6:00 PM",
      services = [],
      amenities = [],
      isMain = false,
      nextOpenSlot = "Today at 2:00 PM",
    } = body;

    if (!name || !neighborhood || !address || latitude === undefined || longitude === undefined || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Clinic name, neighborhood, full address, latitude, longitude, and phone number are required.",
        },
        { status: 400 }
      );
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { success: false, error: "Valid numeric latitude and longitude coordinates are required." },
        { status: 400 }
      );
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}`;
    const osmUrl = `https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lngNum}#map=16/${latNum}/${lngNum}`;

    // If marked as main branch, demote previous main branches
    if (isMain) {
      await db
        .update(clinicLocations)
        .set({ isMain: false })
        .where(eq(clinicLocations.isMain, true));
    }

    const [newLocation] = await db
      .insert(clinicLocations)
      .values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        name,
        slug,
        branchType,
        neighborhood,
        city,
        region,
        address,
        latitude: latNum.toString(),
        longitude: lngNum.toString(),
        phone,
        email,
        hours,
        services: Array.isArray(services) ? services : [],
        amenities: Array.isArray(amenities) ? amenities : [],
        isActive: true,
        isMain: Boolean(isMain),
        nextOpenSlot,
        googleMapsUrl,
        osmUrl,
      })
      .returning();

    // Log admin audit
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        action: "CLINIC_LOCATION_ADDED",
        entityType: "clinic_locations",
        entityId: newLocation.id,
        summary: `Admin added new clinic location: "${newLocation.name}" (${newLocation.neighborhood}, ${newLocation.city}) at [${latNum}, ${lngNum}].`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: newLocation,
      message: `Clinic location "${newLocation.name}" successfully created and integrated into NiniMed network!`,
    });
  } catch (error: any) {
    console.error("Error creating clinic location:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create clinic location" },
      { status: 500 }
    );
  }
}
