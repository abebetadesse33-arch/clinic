import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, auditLogs, users, patients } from "@/db/schema";
import { createTaskSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/tasks
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedRole = searchParams.get("role");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    if (assignedRole) {
      const data = await db
        .select()
        .from(tasks)
        .where(eq(tasks.assignedToRole, assignedRole as any))
        .orderBy(desc(tasks.createdAt));
      return NextResponse.json({ success: true, data });
    }

    if (patientId) {
      const data = await db
        .select()
        .from(tasks)
        .where(eq(tasks.patientId, patientId))
        .orderBy(desc(tasks.createdAt));
      return NextResponse.json({ success: true, data });
    }

    if (status) {
      const data = await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, status as any))
        .orderBy(desc(tasks.createdAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/v1/tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createTaskSchema.parse(body);

    const priorityMap: Record<string, "routine" | "urgent" | "stat"> = {
      low: "routine",
      medium: "routine",
      high: "urgent",
      urgent: "urgent",
      stat: "stat",
      routine: "routine",
    };

    const sessionId = req.cookies.get("Nini_session")?.value;
    let assignedByUserId = sessionId;
    if (!assignedByUserId) {
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      assignedByUserId = firstUser?.id;
    }

    let targetPatientId = validated.patientId;
    if (!targetPatientId) {
      const [firstPat] = await db.select({ id: patients.id }).from(patients).limit(1);
      targetPatientId = firstPat?.id;
    }

    if (!targetPatientId || !assignedByUserId) {
      return NextResponse.json(
        { success: false, error: "Valid patient and authenticated clinician required to create task" },
        { status: 400 }
      );
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: targetPatientId,
        encounterId: validated.encounterId,
        title: validated.title,
        description: validated.description || validated.title,
        assignedToRole: validated.assignedRole,
        assignedByUserId,
        priority: priorityMap[validated.priority] || "routine",
        dueDate: validated.dueDate ? validated.dueDate.toString().substring(0, 10) : undefined,
        status: "pending",
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "TASK_CREATED",
      entityType: "tasks",
      entityId: newTask.id,
      summary: `Assigned task "${newTask.title}" to ${newTask.assignedToRole} with priority ${newTask.priority}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newTask, message: "Clinical task created" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating task:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
