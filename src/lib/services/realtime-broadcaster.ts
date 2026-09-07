import { db } from "@/db";
import { notifications } from "@/db/schema";
import { notificationBus } from "@/lib/notifications/notification-service";

export interface BroadcastMessage {
  tenantId?: string;
  organizationId?: string;
  encounterId?: string;
  patientId?: string;
  targetRole?: string;
  targetUserId?: string;
  eventType: string;
  title: string;
  body: string;
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string;
  payload?: Record<string, unknown>;
}

export class RealtimeBroadcaster {
  /**
   * Broadcast real-time message to active WebSocket/SSE subscribers & persist notifications
   */
  static async broadcast(message: BroadcastMessage) {
    const orgId = message.organizationId || message.tenantId;

    // 1. If target user specified, persist to notifications table
    if (orgId && message.targetUserId) {
      try {
        await db.insert(notifications).values({
          organizationId: orgId,
          recipientUserId: message.targetUserId,
          type: (message.eventType as any) || "system_alert",
          title: message.title,
          body: message.body,
          priority: message.priority || "normal",
          actionUrl: message.actionUrl || null,
          relatedEntityType: message.encounterId ? "encounter" : message.patientId ? "patient" : null,
          relatedEntityId: message.encounterId || message.patientId || null,
          metadata: message.payload || {},
        });
      } catch (e) {
        console.error("Persist notification error:", e);
      }
    }

    notificationBus.emit("notification", {
      id: `realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      recipientUserId: message.targetUserId || null,
      targetRole: message.targetRole || null,
      category: "system",
      title: message.title,
      body: message.body,
      priority: message.priority || "normal",
      actionUrl: message.actionUrl,
      actionText: "View Details",
      relatedEntityType: message.encounterId ? "encounter" : message.patientId ? "patient" : null,
      relatedEntityId: message.encounterId || message.patientId || null,
      metadata: message.payload || {},
      createdAt: new Date().toISOString(),
    });

    // 2. In-memory / Redis pub-sub payload simulation
    const channel = `org:${orgId}:role:${message.targetRole || "all"}`;
    const broadcastPayload = {
      channel,
      timestamp: new Date().toISOString(),
      ...message,
    };

    // Logging broadcast event for observability
    if (process.env.NODE_ENV !== "production") {
      console.log(`[RealtimeBroadcaster] Broadcasted to ${channel}:`, broadcastPayload.title);
    }

    return {
      success: true,
      channel,
      broadcastPayload,
    };
  }

  /**
   * Broadcast emergency / critical vital alert to care team
   */
  static async broadcastCriticalAlert(params: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    patientName: string;
    reason: string;
    vitals: Record<string, unknown>;
  }) {
    return await this.broadcast({
      tenantId: params.tenantId,
      encounterId: params.encounterId,
      patientId: params.patientId,
      targetRole: "physician",
      eventType: "critical_alert",
      title: `🚨 CRITICAL ALERT: ${params.patientName}`,
      body: `${params.reason}. Immediate clinician review required.`,
      priority: "critical",
      actionUrl: `/workflows/admission?encounterId=${params.encounterId}`,
      payload: { vitals: params.vitals },
    });
  }

  /**
   * Broadcast SLA escalation to supervisor
   */
  static async broadcastSlaEscalation(params: {
    tenantId: string;
    encounterId: string;
    workflow: string;
    state: string;
    overdueMinutes: number;
    escalatedRole: string;
  }) {
    return await this.broadcast({
      tenantId: params.tenantId,
      encounterId: params.encounterId,
      targetRole: params.escalatedRole,
      eventType: "system_alert",
      title: `⏱️ SLA BREACH ESCALATION: ${params.workflow.toUpperCase()} (${params.state})`,
      body: `Workflow state '${params.state}' is overdue by ${params.overdueMinutes} minutes. Escalated to ${params.escalatedRole}.`,
      priority: "high",
      actionUrl: `/admin/state-machine?encounterId=${params.encounterId}`,
      payload: { workflow: params.workflow, state: params.state, overdueMinutes: params.overdueMinutes },
    });
  }
}
