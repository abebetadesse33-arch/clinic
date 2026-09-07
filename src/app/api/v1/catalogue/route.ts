import { NextRequest, NextResponse } from "next/server";
import {
  PHARMACY_MASTER_CATALOGUE,
  LABORATORY_PROTOCOLS_CATALOGUE,
  getCatalogueSummary,
  searchPharmacyCatalogue,
  searchLaboratoryProtocols,
} from "@/lib/catalogue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // 'all' | 'pharmacy' | 'laboratory' | 'supplies'
    const q = searchParams.get("q") || "";
    const section = searchParams.get("section");
    const category = searchParams.get("category");
    const isControlled = searchParams.get("isControlled");
    const rxOtc = searchParams.get("rxOtc") as "Rx" | "OTC" | null;
    const specimen = searchParams.get("specimen");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));

    const summary = getCatalogueSummary();

    let pharmacyResults = searchPharmacyCatalogue(q, {
      sectionNumber: section ? parseInt(section, 10) : undefined,
      category: category || undefined,
      isControlled: isControlled !== null && isControlled !== undefined ? isControlled === "true" : undefined,
      rxOtc: rxOtc || undefined,
    });

    if (type === "supplies") {
      pharmacyResults = pharmacyResults.filter((item) => item.sectionNumber === 18);
    } else if (type === "pharmacy") {
      pharmacyResults = pharmacyResults.filter((item) => item.sectionNumber !== 18);
    }

    let labResults = searchLaboratoryProtocols(q, {
      category: category || undefined,
      specimen: specimen || undefined,
    });

    if (type === "pharmacy" || type === "supplies") {
      labResults = [];
    } else if (type === "laboratory") {
      pharmacyResults = [];
    }

    // Pagination for response
    const totalItems = pharmacyResults.length + labResults.length;
    const offset = (page - 1) * limit;

    return NextResponse.json({
      success: true,
      summary,
      counts: {
        pharmacy: pharmacyResults.length,
        laboratory: labResults.length,
        total: totalItems,
      },
      data: {
        pharmacy: pharmacyResults.slice(offset, offset + limit),
        laboratory: labResults.slice(offset, offset + limit),
      },
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query clinical catalogue" },
      { status: 500 }
    );
  }
}
