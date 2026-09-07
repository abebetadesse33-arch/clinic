import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { criticalAlerts } from "@/db/schema";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { eq, and, isNull } from "drizzle-orm";
import { createTamperEvidentAuditLog } from "@/lib/security/tenant-guard";

// POST /api/v1/orders/critical-alerts/[id]/ack - Acknowledge a critical/panic value alert
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { note } = body;

    const [alert] = await db
      .update(criticalAlerts)
      .set({
        acknowledgedBy: sessionUserId,
        acknowledgedAt: new Date(),
        acknowledgmentNote: note || "Clinician acknowledged critical panic value",
      })
      .where(and(eq(criticalAlerts.id, params.id), isNull(criticalAlerts.acknowledgedAt)))
      .returning();

    if (!alert) {
      return NextResponse.json(
        { success: false, error: "Critical alert not found or already acknowledged" },
        { status: 400 }
      );
    }

    // Tamper-evident audit log for critical communication compliance
    await createTamperEvidentAuditLog({
      tenantId: alert.tenantId,
      userId: sessionUserId,
      action: "CRITICAL_VALUE_ACKNOWLEDGED",
      entityType: "critical_alerts",
      entityId: alert.id,
      payload: {
        orderId: alert.orderId,
        testName: alert.testName,
        criticalValue: alert.criticalValue,
        tier: alert.tier,
        note: note || null,
      },
      summary: `Clinician ${sessionUserId} acknowledged critical panic value '${alert.testName}: ${alert.criticalValue}' at tier '${alert.tier}'`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      data: alert,
      message: "Critical panic value alert successfully acknowledged",
    });
  } catch (error: any) {
    console.error("[CriticalAlert:ACK] Error acknowledging critical alert:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to acknowledge critical alert" },
      { status: 500 }
    );
  }
}
