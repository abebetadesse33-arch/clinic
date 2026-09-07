import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { carePlans, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// PATCH /api/v1/care-plans/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { interventions, goals, status } = body;

    const [updated] = await db
      .update(carePlans)
      .set({
        interventions: interventions || undefined,
        goals: goals || undefined,
        status: status || undefined,
        updatedAt: new Date(),
      })
      .where(eq(carePlans.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Care plan not found" },
        { status: 404 }
      );
    }

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
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
