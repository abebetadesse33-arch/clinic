import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const medication = searchParams.get("medication") || "warfarin";

  const fhirClinicalUseIssueBundle = {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "ClinicalUseIssue",
          id: "issue-warfarin-aspirin",
          meta: { versionId: "1", lastUpdated: new Date().toISOString() },
          type: "interaction",
          subject: [
            { display: "Warfarin Sodium" },
            { display: "Aspirin (Acetylsalicylic acid)" }
          ],
          status: {
            coding: [{ system: "http://hl7.org/fhir/clinical-use-issue-status", code: "active", display: "Active" }]
          },
          description: "Additive antiplatelet and anticoagulant synergistic effect increasing major hemorrhage risk.",
          interaction: {
            interactant: [
              { itemCodeableConcept: { text: "Warfarin" } },
              { itemCodeableConcept: { text: "Aspirin" } }
            ],
            type: {
              coding: [{ system: "http://hl7.org/fhir/interaction-type", code: "pharmacodynamic", display: "Pharmacodynamic Synergism" }]
            },
            effect: {
              concept: { text: "Gastrointestinal and systemic hemorrhage risk" }
            },
            incidence: {
              coding: [{ system: "http://hl7.org/fhir/clinical-use-issue-incidence", code: "frequent", display: "Frequent" }]
            },
            management: {
              text: "Avoid combination unless explicitly indicated for secondary cardiac prevention with rigorous INR monitoring."
            }
          }
        }
      }
    ]
  };

  return NextResponse.json(fhirClinicalUseIssueBundle, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}
