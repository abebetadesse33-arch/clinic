import { NextRequest, NextResponse } from "next/server";
import { processPharmacistReview } from "@/lib/services/admission-workflow-service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { patientId, tenantId, pharmacistId, reviews, pharmacistNotes } = body;

    if (!patientId || !tenantId || !pharmacistId || !reviews || !Array.isArray(reviews)) {
      return NextResponse.json(
        { error: "patientId, tenantId, pharmacistId, and reviews array required" },
        { status: 400 }
      );
    }

    const result = await processPharmacistReview({
      encounterId: params.id,
      patientId,
      tenantId,
      pharmacistId,
      reviews,
      pharmacistNotes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Pharmacist review error:", error);
    return NextResponse.json({ error: "Failed to process medication review" }, { status: 500 });
  }
}
