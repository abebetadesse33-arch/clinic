import { NextResponse } from "next/server";
import { db } from "@/db";
import { configAuditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

const INITIAL_AUDITS = [
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    entityType: "automation_rule",
    entityId: "rule-auto-01",
    action: "create",
    oldValue: null,
    newValue: { name: "Elevated HbA1c > 8.5% → Dietitian Referral", triggerType: "lab_value" },
    reason: "Aligned with revised KDIGO 2024 diabetes in CKD clinical guidelines",
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    entityType: "workflow_template",
    entityId: "tmpl-01",
    action: "update",
    oldValue: { version: 1, stepsCount: 4 },
    newValue: { version: 2, stepsCount: 5 },
    reason: "Added mandatory Care Plan Synchronization step upon specialist consult completion",
  },
  {
    organizationId: DEFAULT_ORGANIZATION_ID,
    entityType: "registration_config",
    entityId: "cfg-reg-01",
    action: "update",
    oldValue: { requireInsuranceCardUpload: false },
    newValue: { requireInsuranceCardUpload: true },
    reason: "Streamline insurance authorization and payer verification",
  },
];

export async function GET() {
  try {
    let rows = await db
      .select({
        id: configAuditLogs.id,
        organizationId: configAuditLogs.organizationId,
        adminId: configAuditLogs.adminId,
        adminName: configAuditLogs.adminName,
        entityType: configAuditLogs.entityType,
        entityId: configAuditLogs.entityId,
        action: configAuditLogs.action,
        oldValue: configAuditLogs.oldValue,
        newValue: configAuditLogs.newValue,
        reason: configAuditLogs.reason,
        createdAt: configAuditLogs.createdAt,
      })
      .from(configAuditLogs)
      .orderBy(desc(configAuditLogs.createdAt));

    if (rows.length === 0) {
      // Find an admin user or first user for foreign key compliance
      const [adminUser] = await db.select({ id: users.id, fullName: users.fullName }).from(users).limit(1);

      if (adminUser) {
        await db.insert(configAuditLogs).values(
          INITIAL_AUDITS.map((a) => ({
            organizationId: a.organizationId,
            adminId: adminUser.id,
            adminName: adminUser.fullName || "Hospital Operations Admin",
            entityType: a.entityType,
            entityId: a.entityId,
            action: a.action,
            oldValue: a.oldValue,
            newValue: a.newValue,
            reason: a.reason,
          }))
        );

        rows = await db
          .select({
            id: configAuditLogs.id,
            organizationId: configAuditLogs.organizationId,
            adminId: configAuditLogs.adminId,
            adminName: configAuditLogs.adminName,
            entityType: configAuditLogs.entityType,
            entityId: configAuditLogs.entityId,
            action: configAuditLogs.action,
            oldValue: configAuditLogs.oldValue,
            newValue: configAuditLogs.newValue,
            reason: configAuditLogs.reason,
            createdAt: configAuditLogs.createdAt,
          })
          .from(configAuditLogs)
          .orderBy(desc(configAuditLogs.createdAt));
      }
    }

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    console.error("[admin/config-audit GET error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to query config audits" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, entityId, action, oldValue, newValue, reason, adminId, adminName } = body;

    if (!entityType || !entityId || !action) {
      return NextResponse.json({ success: false, error: "entityType, entityId, and action are required" }, { status: 400 });
    }

    let validAdminId = adminId;
    let resolvedAdminName = adminName || "Operations Admin";

    if (!validAdminId) {
      const [user] = await db.select({ id: users.id, fullName: users.fullName }).from(users).limit(1);
      if (user) {
        validAdminId = user.id;
        resolvedAdminName = user.fullName || resolvedAdminName;
      }
    }

    if (!validAdminId) {
      return NextResponse.json({ success: false, error: "Valid admin user is required for audit trail" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(configAuditLogs)
      .values({
        organizationId: DEFAULT_ORGANIZATION_ID,
        adminId: validAdminId,
        adminName: resolvedAdminName,
        entityType,
        entityId,
        action,
        oldValue: oldValue || null,
        newValue: newValue || null,
        reason: reason || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted,
      message: "Configuration audit log entry recorded",
    });
  } catch (err: any) {
    console.error("[admin/config-audit POST error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
