import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateReturning } from "@/lib/db/returning";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";

// PATCH /api/v1/tasks/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { status } = body;

    const [updated] = await updateReturning(db, tasks, {
        status,
        completedAt: status === "completed" ? new Date() : undefined,
      }, eq(tasks.id, params.id));

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await db.insert(auditLogs).values({
      tenantId: auth.user.organizationId,
      action: "TASK_STATUS_UPDATED",
      entityType: "tasks",
      entityId: updated.id,
      summary: `Task "${updated.title}" marked as ${status}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Task status updated to ${status}`,
    });
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}
