import { NextResponse } from "next/server";
import { db } from "@/db";
import { automationRules } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

type TriggerType = "lab_value" | "vital" | "assessment" | "diagnosis" | "medication" | "sdoh" | "risk_score";

const INITIAL_RULES: {
  organizationId: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  condition: any;
  action: any;
  priority: number;
  isActive: boolean;
  escalationTimeoutMinutes: number;
}[] = [
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Elevated Glycated Hemoglobin (HbA1c > 8.5%) → Dietitian Referral",
    description: "Automatically generates a clinical nutrition referral suggestion for patients with uncontrolled diabetes",
    triggerType: "lab_value",
    condition: { metric: "hba1c", operator: ">", threshold: 8.5 },
    action: {
      type: "suggest_referral",
      targetRole: "dietitian",
      urgency: "urgent",
      reason: "HbA1c exceeds 8.5% — initiate renal-diabetic medical nutrition therapy",
      autoApprove: false,
    },
    priority: 1,
    isActive: true,
    escalationTimeoutMinutes: 1440,
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Elevated Morse/Berg Fall Risk Score → Physiotherapy Evaluation",
    description: "Triggers a physiotherapy mobility evaluation when fall assessment indicates moderate or high vulnerability",
    triggerType: "risk_score",
    condition: { metric: "berg_balance", operator: "<=", threshold: 45 },
    action: {
      type: "suggest_referral",
      targetRole: "physiotherapist",
      urgency: "routine",
      reason: "Berg balance score <= 45 — perform baseline conditioning and fall prevention plan",
      autoApprove: false,
    },
    priority: 2,
    isActive: true,
    escalationTimeoutMinutes: 2880,
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Moderate-to-Severe Depressive Symptoms (PHQ-9 >= 10) → Psychology Consult",
    description: "Triggers psychological support directive when patient-reported PHQ-9 screen meets clinical threshold",
    triggerType: "assessment",
    condition: { metric: "phq9_score", operator: ">=", threshold: 10 },
    action: {
      type: "suggest_referral",
      targetRole: "psychologist",
      urgency: "urgent",
      reason: "PHQ-9 score >= 10 indicates moderate depressive burden — initiate behavioral activation & CBT protocol",
      autoApprove: false,
    },
    priority: 3,
    isActive: true,
    escalationTimeoutMinutes: 720,
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: "Renal Function Decline (eGFR < 45) → Clinical Pharmacist Review",
    description: "Automatically dispatches a task to clinical pharmacy when patient renal metrics require dose adjustments",
    triggerType: "lab_value",
    condition: { metric: "egfr", operator: "<", threshold: 45 },
    action: {
      type: "create_task",
      targetRole: "pharmacist",
      urgency: "urgent",
      reason: "eGFR < 45 mL/min — perform full medication safety audit and renal dose capping review",
      autoApprove: true,
    },
    priority: 1,
    isActive: true,
    escalationTimeoutMinutes: 360,
  },
];

const VALID_TRIGGER_TYPES: TriggerType[] = [
  "lab_value",
  "vital",
  "assessment",
  "diagnosis",
  "medication",
  "sdoh",
  "risk_score",
];

export async function GET() {
  try {
    let rows = await db
      .select()
      .from(automationRules)
      .orderBy(desc(automationRules.priority), desc(automationRules.createdAt));

    if (rows.length === 0) {
      rows = await db.insert(automationRules).values(INITIAL_RULES).returning();
    }

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    console.error("[admin/automation-rules GET error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to query automation rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, triggerType, condition, action, priority, escalationTimeoutMinutes } = body;

    if (!name || !triggerType || !condition || !action) {
      return NextResponse.json({ success: false, error: "name, triggerType, condition, and action are required" }, { status: 400 });
    }

    const cleanTriggerType = VALID_TRIGGER_TYPES.includes(triggerType) ? triggerType : "lab_value";

    const [newRule] = await db
      .insert(automationRules)
      .values({
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: name.trim(),
        description: description?.trim() || null,
        triggerType: cleanTriggerType,
        condition,
        action,
        priority: priority ? Number(priority) : 1,
        isActive: true,
        escalationTimeoutMinutes: escalationTimeoutMinutes ? Number(escalationTimeoutMinutes) : 1440,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRule,
      message: "Automation rule configured and enabled in clinical inference engine.",
    });
  } catch (err: any) {
    console.error("[admin/automation-rules POST error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, condition, action, isActive, priority, escalationTimeoutMinutes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json({ success: false, error: "Invalid rule UUID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(automationRules)
      .set({
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        condition: condition !== undefined ? condition : existing.condition,
        action: action !== undefined ? action : existing.action,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        priority: priority !== undefined ? Number(priority) : existing.priority,
        escalationTimeoutMinutes: escalationTimeoutMinutes !== undefined ? Number(escalationTimeoutMinutes) : existing.escalationTimeoutMinutes,
        updatedAt: new Date(),
      })
      .where(eq(automationRules.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Automation rule updated successfully",
    });
  } catch (err: any) {
    console.error("[admin/automation-rules PUT error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    await db.delete(automationRules).where(eq(automationRules.id, id));

    return NextResponse.json({
      success: true,
      message: "Automation rule deleted successfully",
    });
  } catch (err: any) {
    console.error("[admin/automation-rules DELETE error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export { PUT as PATCH };

