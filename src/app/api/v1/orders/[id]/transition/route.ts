import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalOrders, auditLogs } from "@/db/schema";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { eq } from "drizzle-orm";
import { validateStateTransition } from "@/lib/workflow/order-state-machine";
import { captureOrderCharge } from "@/lib/billing/order-charge-capture";
import { queueOrderOutboxEvent } from "@/lib/workflow/outbox-worker";
import { createTamperEvidentAuditLog } from "@/lib/security/tenant-guard";
import { dispatchParticipantNotification } from "@/lib/notifications/notification-service";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nextStatus, reason, isCritical = false } = body;

    if (!nextStatus) {
      return NextResponse.json({ success: false, error: "nextStatus is required" }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(clinicalOrders)
        .where(eq(clinicalOrders.id, params.id))
        .limit(1);

      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      // 1. CLOSED-LOOP FINITE STATE MACHINE VALIDATION
      if (!validateStateTransition(order.status, nextStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: `Illegal state jump: Cannot transition order from '${order.status}' to '${nextStatus}'. Workflow requires intermediate verification steps.`,
          },
          { status: 422 }
        );
      }

      // 2. MANDATORY CANCELLATION CLINICAL RATIONALE
      if (nextStatus === "cancelled" && (!reason || reason.trim().length < 5)) {
        return NextResponse.json(
          {
            success: false,
            error: "Order cancellation requires a documented clinical justification (minimum 5 characters).",
          },
          { status: 422 }
        );
      }

      // 3. APPLY UPDATE
      const updateData: Record<string, any> = {
        status: nextStatus,
        updatedAt: new Date(),
      };

      if (nextStatus === "cancelled") {
        updateData.cancellationReason = reason;
        updateData.cancelledBy = sessionUserId;
        updateData.cancelledAt = new Date();
      }

      const [updated] = await tx
        .update(clinicalOrders)
        .set(updateData)
        .where(eq(clinicalOrders.id, params.id))
        .returning();

      // 4. AUTOMATED REVENUE CHARGE CAPTURE ON FINAL VERIFICATION
      if (nextStatus === "final_verified") {
        try {
          await captureOrderCharge({
            orderId: order.id,
            performerUserId: sessionUserId,
            tx,
          });
        } catch (billingErr) {
          console.error("[OrderTransition] Charge capture warning:", billingErr);
        }
      }

      // 5. TAMPER-EVIDENT AUDIT TRAIL
      await createTamperEvidentAuditLog({
        tenantId: order.tenantId,
        userId: sessionUserId,
        action: "ORDER_STATUS_TRANSITION",
        entityType: "clinical_orders",
        entityId: order.id,
        payload: {
          previousStatus: order.status,
          nextStatus,
          reason: reason || null,
        },
        summary: `Order transitioned from ${order.status} -> ${nextStatus} by user ${sessionUserId}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        tx,
      });

      // 6. TRANSACTIONAL OUTBOX EVENT
      await queueOrderOutboxEvent(
        {
          tenantId: order.tenantId,
          orderId: order.id,
          eventType: "ORDER_STATUS_CHANGED",
          payload: {
            encounterId: order.encounterId,
            patientId: order.patientId,
            testName: order.clinicalIndication,
            status: nextStatus,
            isCritical,
            updatedByUserId: sessionUserId,
          },
        },
        tx
      );

      await dispatchParticipantNotification({
        patientId: order.patientId,
        category: "orders",
        type: "order_placed",
        title: `Order ${nextStatus.replace(/_/g, " ")}`,
        body: `Order ${order.id.slice(0, 8)} changed from ${order.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.${reason ? ` Note: ${reason}` : ""}`,
        priority: isCritical || nextStatus === "cancelled" ? "high" : "normal",
        senderUserId: sessionUserId,
        actionUrl: `/clinical/orders?orderId=${order.id}`,
        actionText: "Review order",
        relatedEntityType: "clinical_order",
        relatedEntityId: order.id,
        metadata: {
          workflowDomain: "order",
          previousStatus: order.status,
          nextStatus,
          encounterId: order.encounterId,
          isCritical,
          updatedByUserId: sessionUserId,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Order transitioned to ${nextStatus}`,
      });
    });
  } catch (error: any) {
    console.error("[OrderTransition:PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to transition order status" },
      { status: 500 }
    );
  }
}
