import { db } from "@/db";
import { queueEntries, cases, patients, users } from "@/db/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { RealtimeBroadcaster } from "./realtime-broadcaster";

export interface EnqueueParams {
  tenantId?: string;
  caseId?: string;
  patientId: string;
  providerId?: string;
  queueType?: "walk_in" | "telehealth" | "treat_me_now" | "scheduled";
  priority?: "routine" | "urgent" | "emergency";
  metadata?: Record<string, unknown>;
}

export class QueueService {
  private static DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

  /**
   * Add patient to queue and calculate initial position and wait time
   */
  static async enqueue(params: EnqueueParams) {
    const tenantId = params.tenantId || this.DEFAULT_TENANT_ID;
    const queueType = params.queueType || "treat_me_now";
    const priority = params.priority || "routine";

    // 1. Calculate next position in queue for this provider or general queue
    const activeEntries = await db
      .select({ id: queueEntries.id, position: queueEntries.position, priority: queueEntries.priority })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.tenantId, tenantId),
          inArray(queueEntries.status, ["waiting", "called"]),
          params.providerId ? eq(queueEntries.providerId, params.providerId) : sql`true`
        )
      )
      .orderBy(asc(queueEntries.position));

    let position = activeEntries.length + 1;
    let estimatedWaitMinutes = Math.max(3, activeEntries.length * 6);

    // Emergency priority jumps to position 1
    if (priority === "emergency") {
      position = 1;
      estimatedWaitMinutes = 0;
    } else if (priority === "urgent" && position > 2) {
      position = 2; // Urgent cases queue ahead of routine
      estimatedWaitMinutes = 5;
    }

    const [entry] = await db
      .insert(queueEntries)
      .values({
        tenantId,
        caseId: params.caseId || null,
        patientId: params.patientId,
        providerId: params.providerId || null,
        queueType,
        position,
        priority,
        status: "waiting",
        estimatedWaitMinutes,
        metadata: params.metadata || {},
      })
      .returning();

    // 2. Broadcast queue addition
    await RealtimeBroadcaster.broadcast({
      organizationId: tenantId,
      patientId: params.patientId,
      targetUserId: params.providerId || undefined,
      eventType: "queue.updated",
      title: `Queue #${position}: New Patient Checked In`,
      body: `Patient enqueued for ${queueType.replace("_", " ")} (${priority.toUpperCase()}). Position #${position}.`,
      priority: priority === "emergency" ? "critical" : priority === "urgent" ? "high" : "normal",
      payload: { queueId: entry.id, position, estimatedWaitMinutes, caseId: params.caseId },
    });

    return entry;
  }

  /**
   * Get queue entries with patient and provider details
   */
  static async getQueue(filter: {
    tenantId?: string;
    providerId?: string;
    queueType?: string;
    status?: string[];
  }) {
    const tenantId = filter.tenantId || this.DEFAULT_TENANT_ID;
    const statuses = filter.status || ["waiting", "called", "in_service"];

    const rows = await db
      .select({
        id: queueEntries.id,
        position: queueEntries.position,
        queueType: queueEntries.queueType,
        priority: queueEntries.priority,
        status: queueEntries.status,
        estimatedWaitMinutes: queueEntries.estimatedWaitMinutes,
        calledAt: queueEntries.calledAt,
        startedAt: queueEntries.startedAt,
        completedAt: queueEntries.completedAt,
        createdAt: queueEntries.createdAt,
        metadata: queueEntries.metadata,
        caseId: queueEntries.caseId,
        patientId: queueEntries.patientId,
        providerId: queueEntries.providerId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        providerName: users.fullName,
      })
      .from(queueEntries)
      .leftJoin(patients, eq(queueEntries.patientId, patients.id))
      .leftJoin(users, eq(queueEntries.providerId, users.id))
      .where(
        and(
          eq(queueEntries.tenantId, tenantId),
          inArray(queueEntries.status, statuses as any),
          filter.providerId ? eq(queueEntries.providerId, filter.providerId) : sql`true`,
          filter.queueType ? eq(queueEntries.queueType, filter.queueType as any) : sql`true`
        )
      )
      .orderBy(asc(queueEntries.position), desc(queueEntries.createdAt));

    return rows.map((r) => ({
      ...r,
      patientName: `${r.patientFirstName || "Patient"} ${r.patientLastName || ""}`.trim(),
    }));
  }

  /**
   * Get patient position in queue
   */
  static async getPositionByPatientOrCase(patientId?: string, caseId?: string) {
    if (!patientId && !caseId) return null;

    const conditions = [];
    if (caseId) conditions.push(eq(queueEntries.caseId, caseId));
    if (patientId) conditions.push(eq(queueEntries.patientId, patientId));

    const [entry] = await db
      .select({
        id: queueEntries.id,
        position: queueEntries.position,
        priority: queueEntries.priority,
        status: queueEntries.status,
        estimatedWaitMinutes: queueEntries.estimatedWaitMinutes,
        providerId: queueEntries.providerId,
        caseId: queueEntries.caseId,
        createdAt: queueEntries.createdAt,
      })
      .from(queueEntries)
      .where(and(inArray(queueEntries.status, ["waiting", "called", "in_service"]), and(...conditions)))
      .orderBy(desc(queueEntries.createdAt))
      .limit(1);

    if (!entry) return null;

    // Count how many ahead of this patient
    const ahead = await db
      .select({ count: sql<number>`count(*)` })
      .from(queueEntries)
      .where(
        and(
          inArray(queueEntries.status, ["waiting", "called"]),
          entry.providerId ? eq(queueEntries.providerId, entry.providerId) : sql`true`,
          sql`${queueEntries.createdAt} < ${new Date(entry.createdAt).toISOString()}`
        )
      );

    const actualPosition = (Number(ahead[0]?.count) || 0) + 1;
    const dynamicWaitMins = Math.max(1, actualPosition * 4);

    return {
      ...entry,
      position: actualPosition,
      estimatedWaitMinutes: dynamicWaitMins,
    };
  }

  /**
   * Clinician calls patient to enter exam room / video call
   */
  static async callPatient(queueId: string) {
    const [updated] = await db
      .update(queueEntries)
      .set({
        status: "called",
        calledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueEntries.id, queueId))
      .returning();

    if (updated) {
      await RealtimeBroadcaster.broadcast({
        organizationId: updated.tenantId,
        patientId: updated.patientId,
        eventType: "patient.called",
        title: "👨‍⚕️ Your Doctor is Ready to See You",
        body: "Please proceed into your virtual exam room or clinic consultation room.",
        priority: "high",
        actionUrl: `/patient/treat-me-now?queueId=${updated.id}`,
        payload: { queueId: updated.id, caseId: updated.caseId },
      });
    }

    return updated;
  }

  /**
   * Start consultation
   */
  static async startConsultation(queueId: string) {
    const [updated] = await db
      .update(queueEntries)
      .set({
        status: "in_service",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueEntries.id, queueId))
      .returning();

    if (updated && updated.caseId) {
      await db
        .update(cases)
        .set({ status: "in_consultation", updatedAt: new Date() })
        .where(eq(cases.id, updated.caseId));
    }

    return updated;
  }

  /**
   * Complete consultation and update remaining queue
   */
  static async completeConsultation(queueId: string) {
    const [updated] = await db
      .update(queueEntries)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueEntries.id, queueId))
      .returning();

    if (updated && updated.caseId) {
      await db
        .update(cases)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(cases.id, updated.caseId));
    }

    // Broadcast to update live queue positions for remaining waiting patients
    if (updated) {
      await RealtimeBroadcaster.broadcast({
        organizationId: updated.tenantId,
        eventType: "queue.updated",
        title: "Queue Position Advanced",
        body: "A consultation finished. Estimated wait times have been recalculated.",
        priority: "normal",
      });
    }

    return updated;
  }
}
