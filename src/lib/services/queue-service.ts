import { db } from "@/db";
import { queueEntries, cases, patients, users } from "@/db/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { RealtimeBroadcaster } from "./realtime-broadcaster";
import { WaitingRoomService } from "./waiting-room-service";

export interface EnqueueParams {
  tenantId?: string;
  caseId?: string;
  patientId: string;
  providerId?: string;
  queueType?: "walk_in" | "telehealth" | "treat_me_now" | "scheduled";
  priority?: "routine" | "urgent" | "emergency";
  queueNumber?: string;
  servicePoint?: string;
  department?: string;
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

    const queueNumber = params.queueNumber || `A-${100 + position}`;
    const department = params.department || "General Clinic";
    const servicePoint = params.servicePoint || "Waiting Area";

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
        queueNumber,
        servicePoint,
        department,
        estimatedWaitMinutes,
        metadata: params.metadata || {},
      })
      .returning();

    // 2. Broadcast queue addition to staff
    await RealtimeBroadcaster.broadcast({
      organizationId: tenantId,
      patientId: params.patientId,
      targetUserId: params.providerId || undefined,
      eventType: "queue.updated",
      title: `Queue #${position}: New Patient Checked In`,
      body: `Patient enqueued for ${queueType.replace("_", " ")} (${priority.toUpperCase()}). Ticket: ${queueNumber}.`,
      priority: priority === "emergency" ? "critical" : priority === "urgent" ? "high" : "normal",
      payload: { queueId: entry.id, position, estimatedWaitMinutes, caseId: params.caseId, queueNumber },
    });

    // 3. Broadcast to Waiting Room TV Displays
    WaitingRoomService.broadcast({
      type: "queue_updated",
      tenantId,
      payload: {
        queueId: entry.id,
        queueNumber,
        position,
        department,
        status: "waiting",
        priority,
      },
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
    department?: string;
    status?: string[];
  }) {
    const tenantId = filter.tenantId || this.DEFAULT_TENANT_ID;
    const statuses = filter.status || ["waiting", "called", "in_service"];

    const rows = await db
      .select({
        id: queueEntries.id,
        position: queueEntries.position,
        queueNumber: queueEntries.queueNumber,
        servicePoint: queueEntries.servicePoint,
        department: queueEntries.department,
        calledByUserId: queueEntries.calledByUserId,
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
          filter.queueType ? eq(queueEntries.queueType, filter.queueType as any) : sql`true`,
          filter.department ? eq(queueEntries.department, filter.department) : sql`true`
        )
      )
      .orderBy(asc(queueEntries.position), desc(queueEntries.createdAt));

    return rows.map((r) => {
      const pFirst = r.patientFirstName || "Patient";
      const pLastInitial = r.patientLastName?.[0] ? `${r.patientLastName[0]}.` : "";
      return {
        ...r,
        queueNumber: r.queueNumber || `A-${100 + r.position}`,
        patientName: `${pFirst} ${r.patientLastName || ""}`.trim(),
        anonymizedName: `${pFirst} ${pLastInitial}`.trim(),
      };
    });
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
        queueNumber: queueEntries.queueNumber,
        priority: queueEntries.priority,
        status: queueEntries.status,
        servicePoint: queueEntries.servicePoint,
        department: queueEntries.department,
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
   * Clinician / Staff calls patient to enter exam room / service point
   */
  static async callPatient(
    queueId: string,
    options?: {
      servicePoint?: string;
      calledByUserId?: string;
      providerId?: string;
    }
  ) {
    const updatePayload: Record<string, any> = {
      status: "called",
      calledAt: new Date(),
      updatedAt: new Date(),
    };

    if (options?.servicePoint) updatePayload.servicePoint = options.servicePoint;
    if (options?.calledByUserId) updatePayload.calledByUserId = options.calledByUserId;
    if (options?.providerId) updatePayload.providerId = options.providerId;

    const [updated] = await db
      .update(queueEntries)
      .set(updatePayload)
      .where(eq(queueEntries.id, queueId))
      .returning();

    if (updated) {
      // Fetch patient and caller details
      const [p] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, updated.patientId))
        .limit(1);

      let callerName = "Healthcare Staff";
      if (options?.calledByUserId || updated.providerId) {
        const [u] = await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, (options?.calledByUserId || updated.providerId)!))
          .limit(1);
        if (u) callerName = u.fullName;
      }

      const ticket = updated.queueNumber || `A-${100 + updated.position}`;
      const destination = updated.servicePoint || "Consultation Room";
      const anonymized = `${p?.firstName || "Patient"} ${p?.lastName?.[0] ? `${p.lastName[0]}.` : ""}`.trim();

      // 1. Mobile app / Portal notification
      await RealtimeBroadcaster.broadcast({
        organizationId: updated.tenantId,
        patientId: updated.patientId,
        eventType: "patient.called",
        title: "👨‍⚕️ Your Turn: Please Proceed to " + destination,
        body: `Ticket ${ticket}: ${callerName} is ready to see you at ${destination}.`,
        priority: "high",
        actionUrl: `/patient/treat-me-now?queueId=${updated.id}`,
        payload: { queueId: updated.id, caseId: updated.caseId, ticket, destination },
      });

      // 2. Broadcast to Waiting Room TV Displays
      WaitingRoomService.broadcast({
        type: "patient_called",
        tenantId: updated.tenantId,
        payload: {
          queueId: updated.id,
          queueNumber: ticket,
          anonymizedName: anonymized,
          servicePoint: destination,
          department: updated.department || "General Clinic",
          providerName: callerName,
          priority: updated.priority,
          calledAt: updated.calledAt?.toISOString() || new Date().toISOString(),
        },
      });
    }

    return updated;
  }

  /**
   * Automatically call the next waiting patient in line
   */
  static async callNextInQueue(params: {
    servicePoint: string;
    department?: string;
    providerId?: string;
    callerUserId?: string;
    tenantId?: string;
  }) {
    const tenantId = params.tenantId || this.DEFAULT_TENANT_ID;

    // Order by priority (emergency first, then urgent, then routine), then position/createdAt
    const waitingCandidates = await db
      .select({
        id: queueEntries.id,
        priority: queueEntries.priority,
        position: queueEntries.position,
        createdAt: queueEntries.createdAt,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.tenantId, tenantId),
          eq(queueEntries.status, "waiting"),
          params.department ? eq(queueEntries.department, params.department) : sql`true`,
          params.providerId ? eq(queueEntries.providerId, params.providerId) : sql`true`
        )
      )
      .orderBy(
        sql`CASE WHEN ${queueEntries.priority} = 'emergency' THEN 1 WHEN ${queueEntries.priority} = 'urgent' THEN 2 ELSE 3 END`,
        asc(queueEntries.position),
        asc(queueEntries.createdAt)
      )
      .limit(1);

    if (!waitingCandidates || waitingCandidates.length === 0) {
      return null;
    }

    const nextPatient = waitingCandidates[0];
    return await this.callPatient(nextPatient.id, {
      servicePoint: params.servicePoint,
      calledByUserId: params.callerUserId,
      providerId: params.providerId,
    });
  }

  /**
   * Update queue entry status directly
   */
  static async updateStatus(
    queueId: string,
    status: "waiting" | "called" | "in_service" | "completed" | "cancelled" | "no_show",
    servicePoint?: string
  ) {
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (servicePoint) updateData.servicePoint = servicePoint;
    if (status === "in_service") updateData.startedAt = new Date();
    if (status === "completed") updateData.completedAt = new Date();

    const [updated] = await db
      .update(queueEntries)
      .set(updateData)
      .where(eq(queueEntries.id, queueId))
      .returning();

    if (updated) {
      WaitingRoomService.broadcast({
        type: "queue_updated",
        tenantId: updated.tenantId,
        payload: {
          queueId: updated.id,
          queueNumber: updated.queueNumber,
          status,
          servicePoint: updated.servicePoint,
        },
      });
    }

    return updated;
  }

  /**
   * Start consultation
   */
  static async startConsultation(queueId: string) {
    return await this.updateStatus(queueId, "in_service");
  }

  /**
   * Complete consultation and update remaining queue
   */
  static async completeConsultation(queueId: string) {
    const updated = await this.updateStatus(queueId, "completed");

    if (updated && updated.caseId) {
      await db
        .update(cases)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(cases.id, updated.caseId));
    }

    return updated;
  }
}
