import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { carePlans, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { updateReturning } from "@/lib/db/returning";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";

// PATCH /api/v1/care-plans/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { interventions, goals, status } = body;

    const [updated] = await updateReturning(db, carePlans, {
        interventions: interventions || undefined,
        goals: goals || undefined,
        status: status || undefined,
        updatedAt: new Date(),
      }, and(eq(carePlans.id, params.id), eq(carePlans.tenantId, auth.user.organizationId)));

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Care plan not found" },
        { status: 404 }
      );
    }

    await db.insert(auditLogs).values({
      tenantId: auth.user.organizationId,
      action: "CARE_PLAN_UPDATED",
      entityType: "care_plans",
      entityId: updated.id,
      summary: `Updated care plan interventions/status for patient ${updated.patientId}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Care plan updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating care plan:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update care plan" },
      { status: 500 }
    );
  }
}
