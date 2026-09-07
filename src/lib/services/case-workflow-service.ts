import { db } from "@/db";
import { cases, patientAssignments, caseMessages, patients, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { RealtimeBroadcaster } from "./realtime-broadcaster";

export type CaseStatus =
  | "registered"
  | "triaged"
  | "assigned"
  | "waiting"
  | "in_consultation"
  | "labs_ordered"
  | "results_ready"
  | "treatment_planned"
  | "completed"
  | "follow_up_scheduled"
  | "cancelled";

export interface TimelineEvent {
  time: string;
  event: string;
  actor: string;
  role: string;
  details?: string;
  stage?: CaseStatus;
}

export class CaseWorkflowService {
  private static DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

  /**
   * Create new case with initial timeline and registered status
   */
  static async createCase(params: {
    tenantId?: string;
    patientId: string;
    chiefComplaint: string;
    priority?: "routine" | "urgent" | "emergency";
    severity?: "mild" | "moderate" | "severe" | "very_severe";
    personal?: Record<string, unknown>;
    symptoms?: Record<string, unknown>;
    aiAnalysis?: Record<string, unknown>;
  }) {
    const tenantId = params.tenantId || this.DEFAULT_TENANT_ID;
    const nowIso = new Date().toISOString();
    const caseNumber = `CASE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const caseId = `case-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const initialTimeline: TimelineEvent[] = [
      {
        time: nowIso,
        event: "Case Registered",
        actor: (params.personal as any)?.fullName || "Patient",
        role: "patient",
        details: `Intake submitted with chief complaint: "${params.chiefComplaint}"`,
        stage: "registered",
      },
    ];

    if (params.aiAnalysis) {
      initialTimeline.push({
        time: nowIso,
        event: "AI Triage Completed",
        actor: "Gemini Clinical CDSS",
        role: "system",
        details: `Urgency classified as ${(params.priority || "routine").toUpperCase()}`,
        stage: "triaged",
      });
    }

    const [created] = await db
      .insert(cases)
      .values({
        caseId,
        caseNumber,
        tenantId,
        patientId: params.patientId,
        status: params.aiAnalysis ? "triaged" : "registered",
        priority: params.priority || "routine",
        severity: params.severity || "moderate",
        chiefComplaint: params.chiefComplaint,
        personal: params.personal || {},
        symptoms: params.symptoms || {},
        aiAnalysis: params.aiAnalysis || {},
        timeline: initialTimeline as any,
        submittedAt: new Date(),
      })
      .returning();

    // Broadcast Case Creation to Care Coordinator
    await RealtimeBroadcaster.broadcast({
      organizationId: tenantId,
      patientId: params.patientId,
      targetRole: "care_coordinator",
      eventType: "case.created",
      title: `📋 New Clinical Case: ${caseNumber}`,
      body: `Patient intake registered (${(params.priority || "routine").toUpperCase()}). Triage active.`,
      priority: params.priority === "emergency" ? "critical" : params.priority === "urgent" ? "high" : "normal",
      actionUrl: `/cases/${created.caseId}`,
      payload: { caseId: created.caseId, caseNumber, priority: params.priority },
    });

    return created;
  }

  /**
   * Assign physician/clinician to case, create assignment record, and notify both parties
   */
  static async assignProvider(params: {
    caseId: string;
    providerId: string;
    providerName: string;
    providerType?: string;
    specialty?: string;
    assignmentType?: "automatic" | "manual" | "patient_choice";
    notes?: string;
  }) {
    // 1. Fetch current case
    const [existingCase] = await db
      .select()
      .from(cases)
      .where(eq(cases.caseId, params.caseId));

    if (!existingCase) {
      throw new Error(`Case with ID ${params.caseId} not found`);
    }

    const nowIso = new Date().toISOString();
    const existingTimeline = (existingCase.timeline as TimelineEvent[]) || [];
    const updatedTimeline: TimelineEvent[] = [
      ...existingTimeline,
      {
        time: nowIso,
        event: "Provider Assigned",
        actor: params.assignmentType === "patient_choice" ? "Patient Selection" : "AI Routing Engine",
        role: params.assignmentType === "patient_choice" ? "patient" : "system",
        details: `Assigned to ${params.providerName} (${params.specialty || "Clinician"}) via ${params.assignmentType || "automatic"} assignment.`,
        stage: "assigned",
      },
    ];

    // 2. Update case
    const [updatedCase] = await db
      .update(cases)
      .set({
        status: "assigned",
        assignedProviderId: params.providerId,
        assignedHandlerId: params.providerId,
        assignedHandlerName: params.providerName,
        assignedRole: params.providerType || "physician",
        timeline: updatedTimeline as any,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, existingCase.id))
      .returning();

    // 3. Create patient assignment record
    if (existingCase.patientId) {
      await db.insert(patientAssignments).values({
        tenantId: existingCase.tenantId || this.DEFAULT_TENANT_ID,
        patientId: existingCase.patientId,
        caseId: existingCase.id,
        providerId: params.providerId,
        providerType: params.providerType || "physician",
        specialty: params.specialty,
        assignmentType: params.assignmentType || "automatic",
        status: "assigned",
        notes: params.notes,
      });
    }

    // 4. Send Instant Notifications:
    // A. Notify Physician
    await RealtimeBroadcaster.broadcast({
      organizationId: existingCase.tenantId || this.DEFAULT_TENANT_ID,
      patientId: existingCase.patientId || undefined,
      targetUserId: params.providerId,
      eventType: "provider.assigned",
      title: `🩺 New Patient Assigned: ${existingCase.caseNumber || params.caseId}`,
      body: `Chief Complaint: "${existingCase.chiefComplaint || "Urgent Clinical Intake"}". Urgency: ${(existingCase.priority || "routine").toUpperCase()}.`,
      priority: existingCase.priority === "emergency" ? "critical" : "high",
      actionUrl: `/cases/${params.caseId}`,
      payload: { caseId: params.caseId, patientId: existingCase.patientId },
    });

    // B. Notify Patient
    if (existingCase.patientId) {
      await RealtimeBroadcaster.broadcast({
        organizationId: existingCase.tenantId || this.DEFAULT_TENANT_ID,
        patientId: existingCase.patientId,
        eventType: "patient.assigned",
        title: `✅ ${params.providerName} Assigned to Your Care`,
        body: `Your clinician has been connected. Please check your queue position and live visit room.`,
        priority: "high",
        actionUrl: `/patient/treat-me-now?caseId=${params.caseId}`,
        payload: { caseId: params.caseId, providerName: params.providerName },
      });
    }

    return updatedCase;
  }

  /**
   * Advance Case Status and record timeline step
   */
  static async updateCaseStatus(params: {
    caseId: string;
    status: CaseStatus;
    actorName: string;
    actorRole: string;
    details?: string;
  }) {
    const [existingCase] = await db
      .select()
      .from(cases)
      .where(eq(cases.caseId, params.caseId));

    if (!existingCase) throw new Error("Case not found");

    const nowIso = new Date().toISOString();
    const existingTimeline = (existingCase.timeline as TimelineEvent[]) || [];
    const updatedTimeline: TimelineEvent[] = [
      ...existingTimeline,
      {
        time: nowIso,
        event: `Status: ${params.status.replace(/_/g, " ").toUpperCase()}`,
        actor: params.actorName,
        role: params.actorRole,
        details: params.details || `Case status transitioned to ${params.status}`,
        stage: params.status,
      },
    ];

    const [updated] = await db
      .update(cases)
      .set({
        status: params.status,
        timeline: updatedTimeline as any,
        completedAt: params.status === "completed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, existingCase.id))
      .returning();

    await RealtimeBroadcaster.broadcast({
      organizationId: existingCase.tenantId || this.DEFAULT_TENANT_ID,
      patientId: existingCase.patientId || undefined,
      eventType: "case.updated",
      title: `Case Status: ${params.status.replace(/_/g, " ").toUpperCase()}`,
      body: params.details || `Case ${existingCase.caseNumber} updated.`,
      priority: "normal",
      actionUrl: `/cases/${params.caseId}`,
      payload: { caseId: params.caseId, status: params.status },
    });

    return updated;
  }

  /**
   * Send a threaded message within a case
   */
  static async sendMessage(params: {
    caseId: string;
    senderId?: string;
    senderName: string;
    senderType: "patient" | "provider" | "care_coordinator" | "system";
    message: string;
    attachments?: Array<{ name: string; url: string; type: string }>;
  }) {
    const [existingCase] = await db
      .select({ id: cases.id, tenantId: cases.tenantId, patientId: cases.patientId, assignedProviderId: cases.assignedProviderId })
      .from(cases)
      .where(eq(cases.caseId, params.caseId));

    if (!existingCase) throw new Error("Case not found");

    const [msg] = await db
      .insert(caseMessages)
      .values({
        tenantId: existingCase.tenantId || this.DEFAULT_TENANT_ID,
        caseId: existingCase.id,
        senderId: params.senderId || null,
        senderName: params.senderName,
        senderType: params.senderType,
        message: params.message,
        attachments: params.attachments || [],
      })
      .returning();

    // Broadcast message to other participant
    const targetUserId = params.senderType === "patient" ? existingCase.assignedProviderId : undefined;
    await RealtimeBroadcaster.broadcast({
      organizationId: existingCase.tenantId || this.DEFAULT_TENANT_ID,
      patientId: existingCase.patientId || undefined,
      targetUserId: targetUserId || undefined,
      eventType: "message.received",
      title: `💬 New Message from ${params.senderName}`,
      body: params.message.length > 80 ? `${params.message.slice(0, 80)}...` : params.message,
      priority: "normal",
      actionUrl: `/cases/${params.caseId}`,
      payload: { caseId: params.caseId, messageId: msg.id },
    });

    return msg;
  }

  /**
   * Get all messages for a case
   */
  static async getMessages(caseId: string) {
    const [c] = await db.select({ id: cases.id }).from(cases).where(eq(cases.caseId, caseId));
    if (!c) return [];

    return await db
      .select()
      .from(caseMessages)
      .where(eq(caseMessages.caseId, c.id))
      .orderBy(desc(caseMessages.createdAt));
  }
}
