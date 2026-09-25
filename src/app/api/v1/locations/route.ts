import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicLocations } from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { getAuthenticatedSessionUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

const HABITAT_MEDIUM_CLINIC_SERVICES = [
  "Primary Care Consultations",
  "Specialist In-Office Consultations",
  "Maternal Antenatal & Postnatal Care",
  "Pediatrics & Child Wellness",
  "Chronic Disease Management",
  "Point-of-Care Rapid Testing (subject to approval)",
  "Clinical Nutrition & MNT",
  "Cardiopulmonary Physiotherapy",
  "Vaccination & Immunization (subject to approval)",
];

function normalizeLegacyHabitatHospitalListing(
  location: typeof clinicLocations.$inferSelect,
) {
  const isLegacyHabitatHospital =
    location.isMain &&
    location.name.toLowerCase().includes("habitat") &&
    (location.name.toLowerCase().includes("24/7 emergency") ||
      (Array.isArray(location.services) &&
        location.services.some((service) =>
          typeof service === "string" &&
          ["24/7 Emergency & Trauma", "ICU & Inpatient Care"].includes(service),
        )));

  if (!isLegacyHabitatHospital) return location;

  return {
    ...location,
    name: "NiniMed Habitat Medium Clinic",
    address: "Habitat area, Debre Birhan, Amhara Region, Ethiopia (exact street address to be confirmed)",
    latitude: "",
    longitude: "",
    phone: "",
    email: null,
    hours: "Operating hours to be confirmed",
    services: HABITAT_MEDIUM_CLINIC_SERVICES,
    amenities: [],
    nextOpenSlot: "Appointment availability to be confirmed",
    googleMapsUrl: null,
    osmUrl: null,
  };
}

// GET /api/v1/locations - Public & Patient lookup of all active clinic branches
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: a valid authenticated session is required." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const branchType = searchParams.get("type");

    const query = db
      .select()
      .from(clinicLocations)
      .where(
        and(
          eq(clinicLocations.isActive, true),
          eq(clinicLocations.tenantId, sessionUser.organizationId),
        ),
      )
      .orderBy(desc(clinicLocations.isMain), asc(clinicLocations.name));

    let rows = (await query).map(normalizeLegacyHabitatHospitalListing);

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
