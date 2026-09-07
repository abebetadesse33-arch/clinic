import { NextRequest, NextResponse } from "next/server";
import { buildMedicationReview } from "@/lib/services/medication-education-service";
import { getSideEffects } from "@/lib/services/medication-education-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { medications, geneVariants, language = "en" } = body;

    if (!medications || !Array.isArray(medications)) {
      return NextResponse.json({ error: "medications array required" }, { status: 400 });
    }

    const review = buildMedicationReview(medications, geneVariants);

    // Enrich with per-drug side effects
    const sideEffectsByDrug: Record<string, ReturnType<typeof getSideEffects>> = {};
    for (const drug of medications) {
      const drugName = typeof drug === "string" ? drug : drug.name;
      const effects = getSideEffects(drugName);
      if (effects.length > 0) {
        sideEffectsByDrug[drugName] = effects;
      }
    }

    return NextResponse.json({
      review,
      sideEffectsByDrug,
      metadata: {
        checkedAt: new Date().toISOString(),
        language,
        vectorsChecked: ["DDI", "drug-food", "pharmacogenomics"],
      },
    });
  } catch (error) {
    console.error("Medication education error:", error);
    return NextResponse.json({ error: "Medication review failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const drug = searchParams.get("drug");
  if (!drug) return NextResponse.json({ error: "drug param required" }, { status: 400 });

  const sideEffects = getSideEffects(drug);
  return NextResponse.json({ drug, sideEffects });
}
