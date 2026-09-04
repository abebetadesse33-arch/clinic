import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workflowDefinitions, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  TRIGGER_OPTIONS,
  STEP_ACTIONS,
  PREBUILT_WORKFLOW_TEMPLATES,
} from "@/lib/workflow/workflow-definitions";

export const dynamic = "force-dynamic";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "all";
    const category = searchParams.get("category");
    const trigger = searchParams.get("trigger");

    if (view === "meta") {
      return NextResponse.json({
        success: true,
        data: {
          triggers: TRIGGER_OPTIONS,
          actions: STEP_ACTIONS,
          templates: PREBUILT_WORKFLOW_TEMPLATES,
        },
      });
    }

    if (view === "triggers") {
      return NextResponse.json({ success: true, data: TRIGGER_OPTIONS });
    }

    if (view === "actions") {
      return NextResponse.json({ success: true, data: STEP_ACTIONS });
    }

    if (view === "templates") {
      return NextResponse.json({ success: true, data: PREBUILT_WORKFLOW_TEMPLATES });
    }

    let workflows = await db
      .select({
        id: workflowDefinitions.id,
        name: workflowDefinitions.name,
        description: workflowDefinitions.description,
        triggerEvent: workflowDefinitions.triggerEvent,
        conditions: workflowDefinitions.conditions,
        steps: workflowDefinitions.steps,
        isActive: workflowDefinitions.isActive,
        createdAt: workflowDefinitions.createdAt,
        updatedAt: workflowDefinitions.updatedAt,
        createdByName: users.fullName,
      })
      .from(workflowDefinitions)
      .leftJoin(users, eq(workflowDefinitions.createdBy, users.id))
      .where(eq(workflowDefinitions.tenantId, TENANT_ID))
      .orderBy(desc(workflowDefinitions.createdAt));

    if (trigger && trigger !== "ALL") {
      workflows = workflows.filter((w) => w.triggerEvent === trigger);
    }

    return NextResponse.json({
      success: true,
      data: workflows,
      total: workflows.length,
      meta: {
        totalTriggersAvailable: TRIGGER_OPTIONS.length,
        totalActionsAvailable: STEP_ACTIONS.length,
        templatesAvailable: PREBUILT_WORKFLOW_TEMPLATES.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[WORKFLOWS GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── 1. Create Custom Workflow ──────────────────────────────────────────
    if (action === "create") {
      const { name, description, triggerEvent, conditions, steps } = body;
      if (!name || !triggerEvent || !steps || !Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json(
          { error: "name, triggerEvent and at least one step are required." },
          { status: 400 }
        );
      }

      const [wf] = await db
        .insert(workflowDefinitions)
        .values({
          tenantId: TENANT_ID,
          name,
          description: description || null,
          triggerEvent,
          conditions: conditions || {},
          steps,
          isActive: true,
        })
        .returning();

      return NextResponse.json({ success: true, data: wf, message: "Workflow created successfully." }, { status: 201 });
    }

    // ── 2. Toggle Active State ─────────────────────────────────────────────
    if (action === "toggle") {
      const { workflowId, isActive } = body;
      if (!workflowId) return NextResponse.json({ error: "workflowId required" }, { status: 400 });

      const [updated] = await db
        .update(workflowDefinitions)
        .set({ isActive: Boolean(isActive), updatedAt: new Date() })
        .where(and(eq(workflowDefinitions.id, workflowId), eq(workflowDefinitions.tenantId, TENANT_ID)))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    // ── 3. Update Existing Workflow ────────────────────────────────────────
    if (action === "update") {
      const { workflowId, name, description, triggerEvent, conditions, steps } = body;
      if (!workflowId) return NextResponse.json({ error: "workflowId required" }, { status: 400 });

      const updateData: any = { updatedAt: new Date() };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (triggerEvent) updateData.triggerEvent = triggerEvent;
      if (conditions !== undefined) updateData.conditions = conditions;
      if (steps) updateData.steps = steps;

      const [updated] = await db
        .update(workflowDefinitions)
        .set(updateData)
        .where(and(eq(workflowDefinitions.id, workflowId), eq(workflowDefinitions.tenantId, TENANT_ID)))
        .returning();

      return NextResponse.json({ success: true, data: updated, message: "Workflow updated successfully." });
    }

    // ── 4. Delete Workflow ─────────────────────────────────────────────────
    if (action === "delete") {
      const { workflowId } = body;
      if (!workflowId) return NextResponse.json({ error: "workflowId required" }, { status: 400 });

      await db
        .delete(workflowDefinitions)
        .where(and(eq(workflowDefinitions.id, workflowId), eq(workflowDefinitions.tenantId, TENANT_ID)));

      return NextResponse.json({ success: true, message: "Workflow deleted." });
    }

    // ── 5. Deploy Pre-built End-to-End Template ────────────────────────────
    if (action === "load_template") {
      const { templateId } = body;
      const template = PREBUILT_WORKFLOW_TEMPLATES.find((t) => t.id === templateId);

      if (!template) {
        return NextResponse.json({ error: `Template '${templateId}' not found.` }, { status: 404 });
      }

      // Check if workflow with this name already exists
      const existing = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.name, template.name),
            eq(workflowDefinitions.tenantId, TENANT_ID)
          )
        )
        .limit(1);

      let deployedWf;
      if (existing.length > 0) {
        const [updated] = await db
          .update(workflowDefinitions)
          .set({
            description: template.description,
            triggerEvent: template.triggerEvent,
            conditions: template.conditions,
            steps: template.steps,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(workflowDefinitions.id, existing[0].id))
          .returning();
        deployedWf = updated;
      } else {
        const [inserted] = await db
          .insert(workflowDefinitions)
          .values({
            tenantId: TENANT_ID,
            name: template.name,
            description: template.description,
            triggerEvent: template.triggerEvent,
            conditions: template.conditions,
            steps: template.steps,
            isActive: true,
          })
          .returning();
        deployedWf = inserted;
      }

      return NextResponse.json({
        success: true,
        data: deployedWf,
        message: `Template '${template.name}' successfully deployed to clinical automation engine.`,
      });
    }

    // ── 6. Seed All Pre-built Laboratory & Clinical Templates ───────────────
    if (action === "seed_all_templates") {
      const deployed = [];
      for (const t of PREBUILT_WORKFLOW_TEMPLATES) {
        const [existing] = await db
          .select()
          .from(workflowDefinitions)
          .where(
            and(
              eq(workflowDefinitions.name, t.name),
              eq(workflowDefinitions.tenantId, TENANT_ID)
            )
          )
          .limit(1);

        if (existing) {
          const [updated] = await db
            .update(workflowDefinitions)
            .set({
              description: t.description,
              triggerEvent: t.triggerEvent,
              conditions: t.conditions,
              steps: t.steps,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(workflowDefinitions.id, existing.id))
            .returning();
          deployed.push(updated);
        } else {
          const [inserted] = await db
            .insert(workflowDefinitions)
            .values({
              tenantId: TENANT_ID,
              name: t.name,
              description: t.description,
              triggerEvent: t.triggerEvent,
              conditions: t.conditions,
              steps: t.steps,
              isActive: true,
            })
            .returning();
          deployed.push(inserted);
        }
      }

      return NextResponse.json({
        success: true,
        data: deployed,
        count: deployed.length,
        message: `Successfully initialized ${deployed.length} enterprise clinical workflow templates.`,
      });
    }

    // ── 7. Simulate / Test Run Workflow Execution ──────────────────────────
    if (action === "simulate" || action === "test_run") {
      const { workflowId, workflowName, triggerEvent, steps = [] } = body;

      const stepList = Array.isArray(steps) && steps.length > 0 ? steps : [];
      const executionId = `sim_exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const executionLogs: Array<{
        step: number;
        action: string;
        status: string;
        latencyMs: number;
        output: Record<string, unknown>;
      }> = [];

      let cumulativeTime = 0;
      for (let i = 0; i < stepList.length; i++) {
        const step = stepList[i];
        const actionName = typeof step === "string" ? step : step.action || `STEP_${i + 1}`;
        const latency = Math.floor(Math.random() * 25) + 10;
        cumulativeTime += latency;

        // Generate context-aware mock simulation output
        let mockOutput: Record<string, unknown> = {
          executedAt: new Date(Date.now() + cumulativeTime).toISOString(),
          status: "SUCCESS",
          executionThread: "async_worker_pool_0",
        };

        if (actionName.includes("PRICE") || actionName.includes("INVOICE")) {
          mockOutput = { ...mockOutput, invoiceNumber: `INV-2026-${1000 + i}`, subtotalEtb: "850.00", status: "CLEARED" };
        } else if (actionName.includes("SPECIMEN") || actionName.includes("BARCODE")) {
          mockOutput = { ...mockOutput, accessionNumber: "ACC-LAB-99201", barcode: "982348912", tubeType: "SST-Gel (Gold)" };
        } else if (actionName.includes("METABOLIC") || actionName.includes("LAB") || actionName.includes("BIOCHEMICAL")) {
          mockOutput = { ...mockOutput, analyzerId: "COBAS-6000-A", na: "141 mmol/L", k: "4.2 mmol/L", creatinine: "0.95 mg/dL", anionGap: "12 mEq/L", flag: "NORMAL" };
        } else if (actionName.includes("TELEHEALTH") || actionName.includes("VIDEO")) {
          mockOutput = { ...mockOutput, roomId: "room_tele_webrtc_942", webrtcSignaling: "ONLINE", encryption: "DTLS-SRTP" };
        } else if (actionName.includes("PRESCRIPTION") || actionName.includes("PHARMACY")) {
          mockOutput = { ...mockOutput, rxId: "RX-88210", dispensaryBin: "SHELF-B-12", pharmacistVerification: "VERIFIED" };
        } else if (actionName.includes("ALERT") || actionName.includes("NOTIFY")) {
          mockOutput = { ...mockOutput, channel: "PUSH_AND_SMS", recipientsCount: 3, deliveryLatencyMs: 14 };
        }

        executionLogs.push({
          step: i + 1,
          action: actionName,
          status: "SUCCESS",
          latencyMs: latency,
          output: mockOutput,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          executionId,
          workflowName: workflowName || "Simulated Pipeline",
          triggerEvent: triggerEvent || "MANUAL_TRIGGER",
          stepsExecuted: executionLogs.length,
          totalDurationMs: cumulativeTime,
          logs: executionLogs,
          completedAt: new Date().toISOString(),
          verdict: "ALL_PIPELINE_GATES_PASSED",
        },
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[WORKFLOWS POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
