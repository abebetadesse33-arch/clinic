import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "hypertension";

  const fhirEvidenceBundle = {
    resourceType: "Bundle",
    type: "searchset",
    total: 2,
    entry: [
      {
        resource: {
          resourceType: "Evidence",
          id: "evidence-ada-2026-t2d",
          meta: { versionId: "1", lastUpdated: new Date().toISOString() },
          url: "http://clinic.ai/fhir/Evidence/evidence-ada-2026-t2d",
          title: "SGLT2 Inhibitor Cardiorenal Protection in Type 2 Diabetes",
          status: "active",
          date: "2026-01-01",
          publisher: "American Diabetes Association (ADA)",
          description: "Guideline-directed medical therapy demonstrating 30% reduction in CKD progression and 14% reduction in MACE events.",
          synthesisType: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/synthesis-type", code: "systematic-review", display: "Systematic review" }]
          },
          studyType: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/study-type", code: "RCT", display: "Randomized controlled trial" }]
          },
          certainty: [
            {
              type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/certainty-type", code: "Overall", display: "Overall certainty" }] },
              rating: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/certainty-rating", code: "high", display: "High quality" }] }]
            }
          ]
        }
      },
      {
        resource: {
          resourceType: "Evidence",
          id: "evidence-acc-aha-2025-bp",
          meta: { versionId: "1", lastUpdated: new Date().toISOString() },
          url: "http://clinic.ai/fhir/Evidence/evidence-acc-aha-2025-bp",
          title: "Intensive Blood Pressure Lowering to SBP < 130 mmHg",
          status: "active",
          date: "2025-06-01",
          publisher: "American College of Cardiology / American Heart Association",
          description: "Targeting SBP < 130 mmHg significantly reduces stroke and myocardial infarction risk compared to standard target < 140 mmHg.",
          certainty: [
            {
              type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/certainty-type", code: "Overall", display: "Overall certainty" }] },
              rating: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/certainty-rating", code: "high", display: "High quality" }] }]
            }
          ]
        }
      }
    ]
  };

  return NextResponse.json(fhirEvidenceBundle, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}
