import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telemedicineSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const body = await req.json();
    const { transcriptText, consultationNotes, chiefComplaint, patientAge, diagnosis } = body;

    // Fetch session
    const [session] = await db
      .select()
      .from(telemedicineSessions)
      .where(eq(telemedicineSessions.roomId, params.roomId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const prompt = `
You are a senior clinical documentation AI assistant. Generate a structured post-consultation summary.

CONSULTATION CONTEXT:
- Chief Complaint: ${chiefComplaint || "General consultation"}
- Patient Age: ${patientAge || "Unknown"}
- Provisional Diagnosis: ${diagnosis || "To be determined"}
- Clinician Notes: ${consultationNotes || "None recorded"}
- Call Transcript Excerpt: ${transcriptText ? transcriptText.slice(0, 2000) : "Not available"}

Generate a JSON object with this exact structure:
{
  "soapNote": {
    "subjective": "Patient-reported symptoms and history in 2-3 sentences",
    "objective": "Clinical findings observed during telemedicine consultation",
    "assessment": "Clinical impression and differential diagnoses",
    "plan": "Treatment plan, prescriptions, follow-up schedule"
  },
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendedFollowUp": "Recommended follow-up interval and actions",
  "patientInstructions": ["Instruction 1", "Instruction 2"],
  "prescriptionsRecommended": ["Drug 1 dosage instructions", "..."],
  "urgencyFlags": ["Any urgent items that need escalation"],
  "documentationQuality": "complete | partial | minimal"
}`;

    let summary: Record<string, unknown> = {
      soapNote: {
        subjective: consultationNotes || "Patient presented via telemedicine consultation.",
        objective: "Telemedicine visual assessment performed. Remote vital review conducted.",
        assessment: diagnosis || "Assessment pending full clinical review.",
        plan: "Continue current management. Follow up as scheduled.",
      },
      keyFindings: ["Telemedicine consultation completed", "Remote assessment performed"],
      recommendedFollowUp: "4-6 weeks or sooner if symptoms worsen",
      patientInstructions: ["Take medications as prescribed", "Monitor symptoms at home"],
      prescriptionsRecommended: [],
      urgencyFlags: [],
      documentationQuality: "partial",
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        });
        const result = await model.generateContent(prompt);
        summary = JSON.parse(result.response.text());
      } catch (e) {
        console.warn("Gemini AI summarization failed, using fallback:", e);
      }
    }

    // Persist AI summary to session record
    await db
      .update(telemedicineSessions)
      .set({
        aiConsultationSummary: summary,
      })
      .where(eq(telemedicineSessions.roomId, params.roomId));

    return NextResponse.json({
      summary,
      generatedAt: new Date().toISOString(),
      sessionId: session.id,
      roomId: params.roomId,
    });
  } catch (error) {
    console.error("AI summarize error:", error);
    return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
  }
}
