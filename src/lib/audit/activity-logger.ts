import { db } from "@/db";
import { patientActivities } from "@/db/schema";

export interface LogActivityParams {
  tenantId?: string;
  patientId: string;
  actorUserId?: string | null;
  actorName: string;
  actorRole: "patient" | "physician" | "nurse" | "system" | "triage_staff" | string;
  activityType:
    | "appointment_booked"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "consultation_started"
    | "consultation_completed"
    | "prescription_issued"
    | "medication_dispensed"
    | "lab_ordered"
    | "lab_uploaded"
    | "triage_performed"
    | "vitals_logged"
    | "care_message_sent"
    | "document_uploaded"
    | "profile_updated";
  title: string;
  description?: string;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, any>;
}

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Log an immutable patient activity record in the central timeline
 */
export async function logPatientActivity(params: LogActivityParams) {
  try {
    const [inserted] = await db
      .insert(patientActivities)
      .values({
        tenantId: params.tenantId || DEFAULT_TENANT_ID,
        patientId: params.patientId,
        actorUserId: params.actorUserId || null,
        actorName: params.actorName || "System",
        actorRole: params.actorRole || "system",
        activityType: params.activityType,
        title: params.title,
        description: params.description || null,
        severity: params.severity || "info",
        metadata: params.metadata || {},
      })
      .returning();

    return inserted;
  } catch (error) {
    console.error("Failed to log patient activity:", error);
    return null;
  }
}
