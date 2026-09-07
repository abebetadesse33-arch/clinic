import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stateSlas, stateSlaViolations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DEFAULT_STATE_SLAS } from "@/lib/services/central-state-machine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    const configuredSlas = tenantId
      ? await db.select().from(stateSlas).where(eq(stateSlas.tenantId, tenantId))
      : await db.select().from(stateSlas);

    const violations = tenantId
      ? await db.select().from(stateSlaViolations).where(eq(stateSlaViolations.tenantId, tenantId)).orderBy(desc(stateSlaViolations.createdAt)).limit(50)
      : await db.select().from(stateSlaViolations).orderBy(desc(stateSlaViolations.createdAt)).limit(50);

    return NextResponse.json({
      success: true,
      defaultSlas: DEFAULT_STATE_SLAS,
      configuredSlas,
      violations,
    });
  } catch (error: any) {
    console.error("Fetch SLAs error:", error);
    return NextResponse.json({ error: "Failed to fetch SLAs and violations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, workflow, state, maxDurationSeconds, escalationAction, escalationTargetRole } = body;

    if (!tenantId || !workflow || !state || !maxDurationSeconds) {
      return NextResponse.json(
        { error: "tenantId, workflow, state, and maxDurationSeconds are required" },
        { status: 400 }
      );
    }

    const [sla] = await db
      .insert(stateSlas)
      .values({
        tenantId,
        workflow,
        state,
        maxDurationSeconds,
        escalationAction: escalationAction || "notify_supervisor",
        escalationTargetRole: escalationTargetRole || "doctor",
      })
      .returning();

    return NextResponse.json({ success: true, sla });
  } catch (error: any) {
    console.error("Configure SLA error:", error);
    return NextResponse.json({ error: "Failed to configure state SLA" }, { status: 500 });
  }
}
