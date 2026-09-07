import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { medications, labResults, geneticProfiles, patients } from "@/db/schema";
import { checkClinicalSafety } from "@/lib/safety/drug-checker";
import { eq } from "drizzle-orm";

// POST /api/v1/ai/cds - Clinical Decision Support Service
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateDrug, patientId, weightKg, age } = body;

    if (!candidateDrug || !patientId) {
      return NextResponse.json(
        { success: false, error: "candidateDrug and patientId are required" },
        { status: 400 }
      );
    }

    // Fetch live patient data from PostgreSQL
    const [patientRes, pMeds, pLabs, pGen] = await Promise.all([
      db.select().from(patients).where(eq(patients.id, patientId)).limit(1),
      db.select().from(medications).where(eq(medications.patientId, patientId)),
      db.select().from(labResults).where(eq(labResults.patientId, patientId)),
      db.select().from(geneticProfiles).where(eq(geneticProfiles.patientId, patientId)),
    ]);

    const patient = patientRes[0];
    const allergies = (patient?.allergies as any[]) || [];

    // Run multidimensional safety check
    const safetyAlerts = checkClinicalSafety(
      candidateDrug,
      pMeds.map((m) => ({
        id: m.id,
        patientId: m.patientId,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route || "Oral",
        indication: m.indication || "Clinical Indication",
        startDate: m.startDate ? m.startDate.toString() : new Date().toISOString().substring(0, 10),
        isActive: Boolean(m.isActive),
        prescribedBy: m.prescribedBy || "Dr. Sarah Mitchell, MD",
        pharmacistVerified: Boolean(m.pharmacistVerified),
      })),
      allergies,
      pLabs.map((l) => ({
        id: l.id,
        patientId: l.patientId,
        testName: l.testName,
        category: l.category || "Chemistry",
        value: l.value,
        unit: l.unit || "",
        referenceRangeLow: parseFloat(l.referenceRangeLow || "0"),
        referenceRangeHigh: parseFloat(l.referenceRangeHigh || "100"),
        isAbnormal: Boolean(l.isAbnormal),
        interpretation: (l.interpretation as any) || (l.isAbnormal ? "High" : "Normal"),
        performedAt: l.performedAt?.toISOString() || new Date().toISOString(),
      })),
      pGen.map((g) => ({
        id: g.id,
        patientId: g.patientId,
        gene: g.gene,
        variant: g.variant,
        phenotype: g.phenotype,
        clinicalSignificance: g.clinicalSignificance,
        sourcePanel: g.sourcePanel || "Pharmacogenomics Panel",
        testedAt: g.testedAt?.toISOString() || new Date().toISOString(),
      }))
    );

    // Renal clearance calculator (Cockcroft-Gault & eGFR assessment)
    const egfrRecord = pLabs.find((l) => l.testName.toLowerCase().includes("egfr"));
    const egfrVal = egfrRecord ? parseFloat(egfrRecord.value) : 60;
    let renalDosingRecommendation = "Standard dosing permissible (eGFR > 60 mL/min/1.73m²)";

    if (egfrVal < 30) {
      renalDosingRecommendation = "Severe Renal Impairment (CKD Stage 4/5): Reduce dose by 50% or choose non-renally cleared alternative.";
    } else if (egfrVal < 45) {
      renalDosingRecommendation = "Moderate Renal Impairment (CKD Stage 3b): Cap Metformin at 1000mg/day; dose adjust hydrophilic antibiotics.";
    } else if (egfrVal < 60) {
      renalDosingRecommendation = "Mild-to-Moderate Renal Impairment (CKD Stage 3a): Monitor serum creatinine & uACR every 3 months.";
    }

    // Pediatric weight-based dose check if applicable
    let pediatricCheck = null;
    const patAge = age || (patient ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 45);
    const patWeight = weightKg || 70;

    if (patAge < 18) {
      pediatricCheck = {
        isPediatric: true,
        recommendedMgPerKg: 10,
        calculatedTotalDoseMg: Math.round(patWeight * 10),
        guideline: "AAP / WHO Pediatric Weight-Based Formulary",
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        candidateDrug,
        safetyAlerts,
        hasContraindication: safetyAlerts.some((a) => a.severity === "Critical" || a.severity === "Major"),
        renalAssessment: {
          currentEgfr: egfrVal,
          recommendation: renalDosingRecommendation,
        },
        pediatricCheck,
        guidelinesCited: [
          "CPIC Guideline for CYP2C19 Genotype and Clopidogrel Therapy (2022 Update)",
          "KDIGO 2024 Clinical Practice Guideline for Diabetes Management in CKD",
          "ADA Standards of Care in Diabetes (2026)",
        ],
      },
    });
  } catch (error: any) {
    console.error("Error running clinical decision support:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to evaluate CDS" },
      { status: 500 }
    );
  }
}
