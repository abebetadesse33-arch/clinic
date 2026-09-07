import { NextRequest, NextResponse } from "next/server";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/workflows/execute
 *
 * Fires the workflow engine for a given trigger event + patient context.
 * Executes all active matching workflows and dispatches per-step patient
 * notifications in real time.
 *
 * Body:
 *   {
 *     triggerEvent: string;       // e.g. "LAB_ORDER_SUBMITTED"
 *     patientId: string;          // UUID of the patient
 *     triggeredByUserId?: string; // UUID of the staff member who triggered it
 *     subjectLabel?: string;      // Friendly label, e.g. "CBC - Blood Count"
 *     patientActionUrl?: string;  // Override portal action URL
 *     metadata?: Record<string, unknown>;
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { triggerEvent, patientId, triggeredByUserId, subjectLabel, patientActionUrl, metadata } = body;

    if (!triggerEvent || typeof triggerEvent !== "string") {
      return NextResponse.json({ error: "triggerEvent is required." }, { status: 400 });
    }
    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json({ error: "patientId is required." }, { status: 400 });
    }

    // Secure identity binding: Server session cookie takes priority over client body
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    const effectiveTriggeredByUserId = sessionUserId || triggeredByUserId || undefined;

    const results = await executeWorkflowsForTrigger({
      triggerEvent,
      patientId,
      triggeredByUserId: effectiveTriggeredByUserId,
      subjectLabel,
      patientActionUrl,
      metadata: {
        ...metadata,
        authenticatedSessionId: sessionUserId || null,
      },
    });

    const totalSteps = results.reduce((acc, r) => acc + r.stepsExecuted, 0);
    const totalDuration = results.reduce((acc, r) => acc + r.totalDurationMs, 0);

    return NextResponse.json({
      success: true,
      message: results.length === 0
        ? `No active workflows found for trigger "${triggerEvent}".`
        : `Executed ${results.length} workflow(s) — ${totalSteps} steps completed with patient notifications.`,
      data: {
        workflowsExecuted: results.length,
        totalStepsCompleted: totalSteps,
        totalDurationMs: totalDuration,
        patientNotified: totalSteps > 0,
        executions: results,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[WORKFLOWS EXECUTE]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
