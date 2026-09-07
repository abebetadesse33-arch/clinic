import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { carePlans, auditLogs } from "@/db/schema";
import { createCarePlanSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/care-plans
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (patientId) {
      const data = await db
        .select()
        .from(carePlans)
        .where(eq(carePlans.patientId, patientId))
        .orderBy(desc(carePlans.createdAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(carePlans)
      .orderBy(desc(carePlans.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching care plans:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch care plans" },
      { status: 500 }
    );
  }
}

// POST /api/v1/care-plans
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createCarePlanSchema.parse(body);

    const [newPlan] = await db
      .insert(carePlans)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        createdBy: "11111111-1111-1111-1111-111111111101",
        primaryDiagnosis: validated.primaryDiagnosis,
        goals: validated.goals || [],
        interventions: validated.interventions || [],
        status: "active",
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "CARE_PLAN_CREATED",
      entityType: "care_plans",
      entityId: newPlan.id,
      summary: `Created unified multidisciplinary care plan for patient ${newPlan.patientId} (${newPlan.primaryDiagnosis})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newPlan, message: "Unified Care Plan activated" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating care plan:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create care plan" },
      { status: 500 }
    );
  }
}
