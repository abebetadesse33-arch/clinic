import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemPaymentSettings, auditLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/payment-workflow-settings
 * Returns the full lab/pharmacy payment gate and notification config
 */
export async function GET(req: NextRequest) {
  try {
    const [settings] = await db.select().from(systemPaymentSettings).limit(1);

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          enforceLabPaymentGate: true,
          enforcePharmacyPaymentGate: true,
          autoNotifyLabOnPayment: true,
          autoNotifyPharmacyOnPayment: true,
          allowEmergencyOverride: true,
          globalFreeMode: false,
          allowCashReconciliation: true,
          rolePermissions: {
            waiveFees: ["system_admin", "tenant_admin"],
            emergencyOverride: ["system_admin", "tenant_admin", "physician"],
            cashCollection: ["system_admin", "tenant_admin", "pharmacist", "nurse"],
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/admin/payment-workflow-settings
 * Admin updates lab/pharmacy payment gate toggles, notification routing, and role permissions.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminId, ...updates } = body;

    // Whitelist allowed update fields
    const allowed = [
      "enforceLabPaymentGate",
      "enforcePharmacyPaymentGate",
      "autoNotifyLabOnPayment",
      "autoNotifyPharmacyOnPayment",
      "allowEmergencyOverride",
      "globalFreeMode",
      "allowCashReconciliation",
      "registrationValidityDays",
      "gracePeriodDays",
      "rolePermissions",
    ];

    const sanitized: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) sanitized[key] = updates[key];
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update." },
        { status: 400 }
      );
    }

    sanitized.updatedAt = new Date();

    // Upsert settings (only one row should exist)
    const [existing] = await db.select().from(systemPaymentSettings).limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(systemPaymentSettings)
        .set(sanitized)
        .returning();
    } else {
      [result] = await db
        .insert(systemPaymentSettings)
        .values({
          id: "00000000-0000-0000-0000-000000000001",
          globalFreeMode: false,
          ...sanitized,
        })
        .returning();
    }

    // Audit log
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        userId: adminId || null,
        action: "PAYMENT_WORKFLOW_SETTINGS_UPDATED",
        entityType: "system_payment_settings",
        entityId: result.id,
        summary: `Admin updated payment workflow settings: ${JSON.stringify(sanitized)}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: result,
      message: "Payment workflow settings saved successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Update failed" },
      { status: 500 }
    );
  }
}
