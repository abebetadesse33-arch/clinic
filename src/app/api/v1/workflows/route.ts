/**
 * Workflow Management API Endpoint
 * Trigger, monitor, and manage automated workflows
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/security/auth-session";
import { rbacEngine } from "@/lib/security/advanced-rbac-engine";
import { workflowEngine, WorkflowEvent } from "@/lib/workflow/automation-engine";

export const runtime = "nodejs";

/**
 * GET /api/v1/workflows/executions
 * Get workflow execution history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflowId = req.nextUrl.searchParams.get("workflowId");
    const limit = Number(req.nextUrl.searchParams.get("limit") || "50");

    // Check access
    const accessDecision = await rbacEngine.evaluateAccess({
      userId: session.userId,
      userRoles: session.roles || [],
      organizationId: session.organizationId,
      action: "read",
      resourceType: "workflow:executions",
    });

    if (!accessDecision.allowed) {
      return NextResponse.json(
        { error: "Access Denied" },
        { status: 403 }
      );
    }

    const history = workflowEngine.getExecutionHistory(
      workflowId || undefined,
      limit
    );

    return NextResponse.json({
      success: true,
      executions: history,
      count: history.length,
    });
  } catch (error) {
    console.error("Workflow history error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve workflow history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/workflows/trigger
 * Manually trigger a workflow event
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, data } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: "Event type required" },
        { status: 400 }
      );
    }

    // Check access
    const accessDecision = await rbacEngine.evaluateAccess({
      userId: session.userId,
      userRoles: session.roles || [],
      organizationId: session.organizationId,
      action: "execute",
      resourceType: "workflow:trigger",
    });

    if (!accessDecision.allowed) {
      return NextResponse.json(
        { error: "Access Denied" },
        { status: 403 }
      );
    }

    // Trigger workflow
    const workflowEvent: WorkflowEvent = {
      eventType: eventType as any,
      organizationId: session.organizationId,
      data: data || {},
      timestamp: new Date(),
    };

    const instances = await workflowEngine.triggerOnEvent(workflowEvent);

    return NextResponse.json({
      success: true,
      triggeredInstances: instances.length,
      instances: instances.map((i) => ({
        id: i.id,
        workflowId: i.workflowId,
        state: i.state,
        triggeredAt: i.triggeredAt,
      })),
    });
  } catch (error) {
    console.error("Workflow trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
