import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { carePlans, auditLogs } from "@/db/schema";
import { createCarePlanSchema } from "@/lib/validations/schemas";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { insertReturning } from "@/lib/db/returning";
import { requireAuthenticatedUser, requireRoles, resolveAuthorizedPatient, CLINICIAN_ROLES } from "@/lib/security/auth-session";

// GET /api/v1/care-plans
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    let patientId = searchParams.get("patientId");

    // Patients only ever see their own plans; the unfiltered list is for staff.
    if (auth.user.role === "patient") {
      const access = await resolveAuthorizedPatient(req, patientId);
      if ("response" in access) return access.response;
      patientId = access.patient.id;
    }

    if (patientId) {
      const data = await db
        .select()
        .from(carePlans)
        .where(and(eq(carePlans.patientId, patientId), eq(carePlans.tenantId, auth.user.organizationId)))
        .orderBy(desc(carePlans.createdAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(carePlans)
      .where(eq(carePlans.tenantId, auth.user.organizationId))
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
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const validated = createCarePlanSchema.parse(body);

    const [newPlan] = await insertReturning(db, carePlans, {
        tenantId: auth.user.organizationId,
        patientId: validated.patientId,
        createdBy: auth.user.id,
        primaryDiagnosis: validated.primaryDiagnosis,
        goals: validated.goals || [],
        interventions: validated.interventions || [],
        status: "active",
      });

    await db.insert(auditLogs).values({
      tenantId: auth.user.organizationId,
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
