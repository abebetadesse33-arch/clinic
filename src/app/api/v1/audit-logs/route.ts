import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { createAuditLogSchema } from "@/lib/validations/schemas";
import { desc, eq, ilike, or, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/audit-logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const conditions: any[] = [eq(auditLogs.tenantId, DEFAULT_TENANT_ID)];

    if (action && action !== "all") {
      conditions.push(eq(auditLogs.action, action));
    }

    if (entityType && entityType !== "all") {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
    }

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.summary, `%${search}%`),
          ilike(auditLogs.action, `%${search}%`),
          ilike(auditLogs.entityId, `%${search}%`)
        )
      );
    }

    const data = await db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        summary: auditLogs.summary,
        diff: auditLogs.diff,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.fullName,
        userRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Map to normalized audit format
    const normalized = data.map((item) => ({
      id: item.id ? item.id.toString() : `aud-${Date.now()}`,
      timestamp: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      userId: item.userId || "usr-system",
      userName: item.userName || "System / Automated Agent",
      userRole: item.userRole || "system_admin",
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      summary: item.summary || item.action,
      ipAddress: item.ipAddress || "127.0.0.1",
      details: item.diff,
    }));

    return NextResponse.json({
      success: true,
      data: normalized,
      total: normalized.length,
    });
  } catch (error: any) {
    console.error("Error querying audit logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

// POST /api/v1/audit-logs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createAuditLogSchema.parse(body);

    const [newLog] = await db
      .insert(auditLogs)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        userId: body.userId || "11111111-1111-1111-1111-111111111101",
        action: validated.action,
        entityType: validated.entityType,
        entityId: validated.entityId,
        summary: validated.summary,
        diff: validated.details || {},
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      })
      .returning();

    const serializedLog = newLog
      ? {
          ...newLog,
          id: newLog.id ? newLog.id.toString() : undefined,
        }
      : newLog;

    return NextResponse.json(
      { success: true, data: serializedLog, message: "Audit event recorded" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record audit event" },
      { status: 500 }
    );
  }
}
