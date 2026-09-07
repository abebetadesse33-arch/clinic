import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// PATCH /api/v1/tasks/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status } = body;

    const [updated] = await db
      .update(tasks)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : undefined,
      })
      .where(eq(tasks.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
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
