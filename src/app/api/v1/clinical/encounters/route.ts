import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encounters, patients } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { insertReturning } from "@/lib/db/returning";

const encounterSchema = z.object({
  patientId: z.string().uuid(),
  encounterType: z.enum(["in_person", "telehealth", "consultation", "follow_up"]).default("in_person"),
  chiefComplaint: z.string().trim().min(3).max(500),
  history: z.string().trim().max(5000).default(""),
  examination: z.string().trim().max(5000).default(""),
  assessment: z.string().trim().min(3).max(5000),
  plan: z.string().trim().max(5000).default(""),
  followUpPlan: z.string().trim().max(2000).default(""),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  const patientId = new URL(req.url).searchParams.get("patientId");
  if (!patientId || !z.string().uuid().safeParse(patientId).success) {
    return NextResponse.json({ success: false, error: "A valid patientId is required." }, { status: 400 });
  }

  try {
    const data = await db
      .select()
      .from(encounters)
      .where(and(eq(encounters.patientId, patientId), eq(encounters.tenantId, auth.user.organizationId)))
      .orderBy(desc(encounters.startTime), desc(encounters.createdAt))
      .limit(50);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[ClinicalEncounters:GET] Failed to load encounters:", error);
    return NextResponse.json({ success: false, error: "Failed to load clinical history." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const input = encounterSchema.parse(await req.json());
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, input.patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ success: false, error: "Patient not found in your organization." }, { status: 404 });
    }

    const noteSections = [
      `History:\n${input.history || "Not documented."}`,
      `Examination:\n${input.examination || "Not documented."}`,
      `Assessment:\n${input.assessment}`,
      `Plan:\n${input.plan || "Not documented."}`,
      `Follow-up:\n${input.followUpPlan || "No follow-up plan documented."}`,
    ].join("\n\n");

    const [created] = await insertReturning(db, encounters, {
        tenantId: auth.user.organizationId,
        patientId: input.patientId,
        clinicianId: auth.user.id,
        assignedPhysicianId: auth.user.role === "physician" || auth.user.role === "nurse_practitioner" ? auth.user.id : null,
        encounterType: input.encounterType,
        status: "finished",
        currentStep: "completed",
        chiefComplaint: input.chiefComplaint,
        clinicalNotes: noteSections,
        startTime: new Date(),
        endTime: new Date(),
      });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Please complete the required clinical fields.", details: error.errors }, { status: 422 });
    }
    console.error("[ClinicalEncounters:POST] Failed to save encounter:", error);
    return NextResponse.json({ success: false, error: "Failed to save clinical encounter." }, { status: 500 });
  }
}
