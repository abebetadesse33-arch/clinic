import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encounters, tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRoles, STAFF_ROLES } from "@/lib/security/auth-session";
import { assertEncounterInTenant } from "@/lib/security/tenant-resource";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(_req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  const denied = await assertEncounterInTenant(params.id, auth.user.organizationId);
  if (denied) return denied;

  try {
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, params.id));

    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.encounterId, params.id))
      .orderBy(desc(tasks.priority));

    const progress = (encounter.workflowProgress as Record<string, any>) || {};
    const steps = [
      "frontDesk",
      "nurse",
      "physician",
      "pharmacist",
      "dietitian",
      "socialWork",
      "therapy",
      "careCoordinator",
    ];

    const completedSteps = steps.filter((s) => progress[s]?.status === "completed").length;
    const progressPercent = Math.round((completedSteps / steps.length) * 100);

    return NextResponse.json({
      success: true,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      admissionStatus: encounter.admissionStatus,
      currentStep: encounter.currentStep,
      progressPercent,
      workflowProgress: progress,
      pendingTasks,
    });
  } catch (error) {
    console.error("Get admission status error:", error);
    return NextResponse.json({ error: "Failed to fetch admission status" }, { status: 500 });
  }
}
