import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientQuestionnaires, patients, users } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getPatientFromRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");
  if (explicitPatientId) {
    const [pat] = await db.select().from(patients).where(eq(patients.id, explicitPatientId)).limit(1);
    if (pat) return pat;
  }

  const sessionId = req.cookies.get("Nini_session")?.value;
  if (!sessionId) return null;
  const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
  if (!u) return null;
  const [pat] = await db
    .select()
    .from(patients)
    .where(or(eq(patients.userId, u.id), eq(patients.email, u.email)))
    .limit(1);
  return pat || null;
}

export async function GET(req: NextRequest) {
  try {
    const pat = await getPatientFromRequest(req);
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
  try {
    const pat = await getPatientFromRequest(req);
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
