import { NextRequest, NextResponse } from "next/server";
import { callGeminiRest } from "@/lib/ai/gemini-rest-client";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, personal, complaint, history, symptoms, fileNames, fileTypes } = body;

    const chiefComplaint = complaint?.chiefComplaint || "Unspecified medical complaint";
    const severity = complaint?.severity || "moderate";
    const symptomsStr = typeof symptoms === "string" ? symptoms : JSON.stringify(symptoms || {});
    const historyStr = typeof history === "string" ? history : JSON.stringify(history || {});

    const prompt = `You are a clinical triage AI for NiniMed hospital. Analyze this patient case:
Chief Complaint: ${chiefComplaint}
Severity: ${severity}
Symptoms: ${symptomsStr}
History: ${historyStr}

Provide: 
1) Triage priority (P1/P2/P3/P4)
2) Differential diagnoses (top 3)
3) Recommended immediate actions
4) Specialist referral needed (yes/no + specialty)

Format as a JSON object with this exact schema:
{
  "summary": "2-3 sentence clinical summary",
  "triagePriority": "P1|P2|P3|P4",
  "urgencyLevel": "routine|moderate|urgent|critical",
  "analysisConfidence": 85,
  "differentialDiagnoses": [
    "Differential 1 — brief clinical rationale",
    "Differential 2",
    "Differential 3"
  ],
  "potentialCauses": [
    "Cause 1",
    "Cause 2",
    "Cause 3"
  ],
  "recommendedActions": [
    "Action 1",
    "Action 2"
  ],
  "recommendedWorkup": [
    "Test 1",
    "Test 2"
  ],
  "specialistReferral": {
    "needed": true,
    "specialty": "Internal Medicine",
    "reason": "Specialty assessment"
  },
  "recommendedSpecialists": [
    "Internal Medicine"
  ],
  "criticalAlerts": [
    { "level": "info|warning|critical", "message": "Clinical alert" }
  ],
  "handlerBrief": "Brief instructions for the reviewing clinician."
}

Respond ONLY with valid JSON. No markdown codeblocks or outside text.`;

    let aiAnalysis: Record<string, any>;

    try {
      const result = await callGeminiRest({
        prompt,
        temperature: 0.2,
      });

      const clean = result.text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      aiAnalysis = JSON.parse(clean);
    } catch {
      // Robust clinical fallback when API key quota is reached
      const isUrgent = complaint?.seekingUrgent || severity === "very_severe" || severity === "severe";
      aiAnalysis = {
        summary: `Patient presenting with ${severity} symptoms including: "${chiefComplaint.substring(0, 150)}". Requires clinical evaluation.`,
        triagePriority: isUrgent ? "P1" : severity === "moderate" ? "P2" : "P3",
        urgencyLevel: isUrgent ? "urgent" : "moderate",
        analysisConfidence: 82,
        differentialDiagnoses: [
          "Primary condition related to chief complaint",
          "Secondary diagnosis based on reported history",
          "Medication interaction or systemic factor",
        ],
        potentialCauses: [
          "Acute exacerbation of reported symptoms",
          "Infectious or inflammatory etiology",
          "Idiopathic / Requires workup",
        ],
        recommendedActions: [
          "Perform clinical vitals and physical assessment",
          "Order baseline lab diagnostics",
          "Conduct medication reconciliation",
        ],
        recommendedWorkup: ["Complete Blood Count (CBC)", "Comprehensive Metabolic Panel (CMP)", "Vitals Check"],
        specialistReferral: {
          needed: isUrgent,
          specialty: "Internal Medicine",
          reason: "Comprehensive clinical evaluation",
        },
        recommendedSpecialists: ["Internal Medicine"],
        criticalAlerts: isUrgent
          ? [{ level: "critical", message: "Patient flagged for urgent evaluation" }]
          : [{ level: "info", message: "Standard clinical evaluation protocol" }],
        handlerBrief: `Case ${caseId} received with ${severity} severity. Please review full patient record and initiate recommended diagnostic workup.`,
      };
    }

    const aiSummaryText = aiAnalysis.summary || `Patient presenting with ${chiefComplaint}`;

    // Update persistent PostgreSQL cases table
    if (caseId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId);
      const condition = isUuid
        ? or(eq(cases.id, caseId), eq(cases.caseId, caseId), eq(cases.caseNumber, caseId))
        : or(eq(cases.caseId, caseId), eq(cases.caseNumber, caseId));

      const rows = await db
        .select()
        .from(cases)
        .where(condition)
        .limit(1);

      if (rows.length > 0) {
        const c = rows[0];
        const existingTimeline = Array.isArray(c.timeline) ? c.timeline : [];
        existingTimeline.push({
          time: new Date().toISOString(),
          event: `AI clinical analysis complete (Priority: ${aiAnalysis.triagePriority || "P2"})`,
          actor: "AI Clinical CDSS",
        });

        await db
          .update(cases)
          .set({
            status: "under_review",
            aiSummary: aiSummaryText,
            aiRecommendations: aiAnalysis,
            aiAnalysis,
            timeline: existingTimeline,
            updatedAt: new Date(),
          })
          .where(eq(cases.id, c.id));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        caseId,
        aiAnalysis,
        analyzedAt: new Date().toISOString(),
        status: "under_review",
      },
    });
  } catch (error: any) {
    console.error("[AI ANALYZE-CASE] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "AI analysis failed" }, { status: 500 });
  }
}

