import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientQuestionnaires } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json({ success: true, data: [] });
    }

    const dbQs = await db
      .select()
      .from(patientQuestionnaires)
      .where(eq(patientQuestionnaires.patientId, pat.id))
      .orderBy(desc(patientQuestionnaires.completedAt));

    return NextResponse.json({
      success: true,
      data: dbQs.map((q) => ({
        id: q.id,
        patientId: q.patientId,
        questionnaireType: q.questionnaireType,
        title: q.title,
        totalScore: q.totalScore,
        riskCategory: q.riskCategory,
        completedAt: q.completedAt,
        responses: q.responses,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching questionnaires:", err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { questionnaireType, title, responses, totalScore, riskCategory } = body;

    if (!questionnaireType || !responses) {
      return NextResponse.json(
        { success: false, error: "questionnaireType and responses are required" },
        { status: 400 }
      );
    }

    const [newQ] = await db
      .insert(patientQuestionnaires)
      .values({
        organizationId: pat.tenantId,
        patientId: pat.id,
        questionnaireType,
        title: title || `${questionnaireType.toUpperCase()} Intake Questionnaire`,
        responses,
        totalScore: totalScore || 0,
        riskCategory: riskCategory || "Completed",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newQ,
      message: "Questionnaire submitted and shared with your clinical care team.",
    });
  } catch (err: any) {
    console.error("Error submitting questionnaire:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

