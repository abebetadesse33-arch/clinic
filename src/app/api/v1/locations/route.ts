import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicLocations } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/locations - Public & Patient lookup of all active clinic branches
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const branchType = searchParams.get("type");

    const query = db
      .select()
      .from(clinicLocations)
      .where(eq(clinicLocations.isActive, true))
      .orderBy(desc(clinicLocations.isMain), asc(clinicLocations.name));

    let rows = await query;

    if (city) {
      rows = rows.filter((r) => r.city.toLowerCase().includes(city.toLowerCase()));
    }
    if (branchType) {
      rows = rows.filter((r) => r.branchType === branchType);
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error: any) {
    console.error("Error fetching clinic locations:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch clinic locations" },
      { status: 500 }
    );
  }
}
