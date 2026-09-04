import { NextResponse } from "next/server";
import { db } from "@/db";
import { externalProviders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

const INITIAL_EXTERNAL_PROVIDERS = [
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Regional Kidney & Hypertension Specialists Center",
    specialty: "Outpatient Nephrology",
    facilityName: "Memorial Renal Medical Tower",
    address: "1200 Health Parkway, Suite 400, Springfield",
    email: "referrals@regionalkidney.org",
    phone: "555-0811",
    fax: "555-0812",
    npi: "1892014492",
    fhirEndpoint: "https://fhir.regionalkidney.org/r4",
    preferredTransport: "fhir" as const,
    isActive: true,
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Metro Advanced Cardiovascular Imaging Institute",
    specialty: "Cardiac Imaging & Echo",
    facilityName: "Metro Heart Plaza",
    address: "450 Cardiovascular Blvd, Springfield",
    email: "orders@metrocardiacimaging.org",
    phone: "555-0922",
    fax: "555-0923",
    npi: "1449201993",
    fhirEndpoint: "https://fhir.metrocardiac.org/r4",
    preferredTransport: "fhir" as const,
    isActive: true,
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Community Behavioral Health & Neuropsychology Center",
    specialty: "Clinical Psychology & Psychiatry",
    facilityName: "Pine Rest Medical Building",
    address: "880 Oak Street, Suite 210, Springfield",
    email: "intake@communitybehavioral.org",
    phone: "555-0331",
    fax: "555-0332",
    npi: "1772910041",
    preferredTransport: "email" as const,
    isActive: true,
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Debre Birhan Community Food Bank & Nutrition Network",
    specialty: "Community Aid & Food Security",
    facilityName: "Civic Aid Hub",
    address: "100 Community Way, Debre Birhan",
    email: "directors@communityfoodbank.org",
    phone: "555-0444",
    preferredTransport: "email" as const,
    isActive: true,
  },
];

export async function GET() {
  try {
    let rows = await db
      .select()
      .from(externalProviders)
      .orderBy(desc(externalProviders.createdAt));

    if (rows.length === 0) {
      rows = await db.insert(externalProviders).values(INITIAL_EXTERNAL_PROVIDERS).returning();
    }

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    console.error("[admin/external-providers GET error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to query external providers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, specialty, facilityName, address, email, phone, fax, npi, fhirEndpoint, preferredTransport } = body;

    if (!name || !specialty) {
      return NextResponse.json({ success: false, error: "Name and specialty are required" }, { status: 400 });
    }

    const validTransport = ["fhir", "email", "fax"].includes(preferredTransport) ? preferredTransport : "email";

    const [newProvider] = await db
      .insert(externalProviders)
      .values({
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: name.trim(),
        specialty: specialty.trim(),
        facilityName: facilityName?.trim() || null,
        address: address?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        fax: fax?.trim() || null,
        npi: npi?.trim() || null,
        fhirEndpoint: fhirEndpoint?.trim() || null,
        preferredTransport: validTransport as "fhir" | "email" | "fax",
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newProvider,
      message: "External provider registered in clinical directory",
    });
  } catch (err: any) {
    console.error("[admin/external-providers POST error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, specialty, facilityName, address, email, phone, fax, npi, fhirEndpoint, preferredTransport, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(externalProviders)
      .where(eq(externalProviders.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "External provider not found" }, { status: 404 });
    }

    const validTransport = preferredTransport && ["fhir", "email", "fax"].includes(preferredTransport)
      ? preferredTransport
      : existing.preferredTransport;

    const [updated] = await db
      .update(externalProviders)
      .set({
        name: name !== undefined ? name.trim() : existing.name,
        specialty: specialty !== undefined ? specialty.trim() : existing.specialty,
        facilityName: facilityName !== undefined ? (facilityName ? facilityName.trim() : null) : existing.facilityName,
        address: address !== undefined ? (address ? address.trim() : null) : existing.address,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
        fax: fax !== undefined ? (fax ? fax.trim() : null) : existing.fax,
        npi: npi !== undefined ? (npi ? npi.trim() : null) : existing.npi,
        fhirEndpoint: fhirEndpoint !== undefined ? (fhirEndpoint ? fhirEndpoint.trim() : null) : existing.fhirEndpoint,
        preferredTransport: validTransport as "fhir" | "email" | "fax",
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      })
      .where(eq(externalProviders.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "External provider updated successfully",
    });
  } catch (err: any) {
    console.error("[admin/external-providers PATCH error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    await db.delete(externalProviders).where(eq(externalProviders.id, id));

    return NextResponse.json({
      success: true,
      message: "External provider deleted successfully",
    });
  } catch (err: any) {
    console.error("[admin/external-providers DELETE error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

