import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicLocations, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/locations/[id] - Get single location details
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [found] = await db
      .select()
      .from(clinicLocations)
      .where(eq(clinicLocations.id, params.id))
      .limit(1);

    if (!found) {
      return NextResponse.json(
        { success: false, error: "Clinic location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: found });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch location" },
      { status: 500 }
    );
  }
}

// PUT /api/v1/admin/locations/[id] - Update clinic location details
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      name,
      branchType,
      neighborhood,
      city,
      region,
      address,
      latitude,
      longitude,
      phone,
      email,
      hours,
      services,
      amenities,
      isActive,
      isMain,
      nextOpenSlot,
    } = body;

    const [existing] = await db
      .select()
      .from(clinicLocations)
      .where(eq(clinicLocations.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Clinic location not found" },
        { status: 404 }
      );
    }

    const latNum = latitude !== undefined ? Number(latitude) : Number(existing.latitude);
    const lngNum = longitude !== undefined ? Number(longitude) : Number(existing.longitude);

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}`;
    const osmUrl = `https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lngNum}#map=16/${latNum}/${lngNum}`;

    if (isMain) {
      await db
        .update(clinicLocations)
        .set({ isMain: false })
        .where(eq(clinicLocations.isMain, true));
    }

    const [updated] = await db
      .update(clinicLocations)
      .set({
        name: name !== undefined ? name : existing.name,
        branchType: branchType !== undefined ? branchType : existing.branchType,
        neighborhood: neighborhood !== undefined ? neighborhood : existing.neighborhood,
        city: city !== undefined ? city : existing.city,
        region: region !== undefined ? region : existing.region,
        address: address !== undefined ? address : existing.address,
        latitude: latNum.toString(),
        longitude: lngNum.toString(),
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        hours: hours !== undefined ? hours : existing.hours,
        services: services !== undefined ? services : existing.services,
        amenities: amenities !== undefined ? amenities : existing.amenities,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        isMain: isMain !== undefined ? Boolean(isMain) : existing.isMain,
        nextOpenSlot: nextOpenSlot !== undefined ? nextOpenSlot : existing.nextOpenSlot,
        googleMapsUrl,
        osmUrl,
        updatedAt: new Date(),
      })
      .where(eq(clinicLocations.id, id))
      .returning();

    // Log admin audit
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        action: "CLINIC_LOCATION_UPDATED",
        entityType: "clinic_locations",
        entityId: updated.id,
        summary: `Admin updated clinic location "${updated.name}" (${updated.neighborhood}). Status: ${updated.isActive ? "ACTIVE" : "INACTIVE"}.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Clinic location "${updated.name}" updated successfully!`,
    });
  } catch (error: any) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update location" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/locations/[id] - Deactivate / delete clinic location
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [deleted] = await db
      .update(clinicLocations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(clinicLocations.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        action: "CLINIC_LOCATION_DEACTIVATED",
        entityType: "clinic_locations",
        entityId: deleted.id,
        summary: `Admin deactivated clinic location: "${deleted.name}" (${deleted.neighborhood}).`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: deleted,
      message: `Location "${deleted.name}" has been deactivated from active patient booking.`,
    });
  } catch (error: any) {
    console.error("Error deactivating location:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to deactivate location" },
      { status: 500 }
    );
  }
}
