import { db } from "@/db";
import { encounters, users, patients, careTeams, careTeamMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { dispatchNotification } from "@/lib/notifications/notification-service";

export interface ResolvedCareTeam {
  encounterId: string;
  patientId: string;
  patientUserId: string | null;
  attendingDoctorId: string;
  assignedNurseId: string | null;
  careTeamMemberIds: string[];
}

/**
 * Resolves the deterministic care team for a given clinical encounter.
 * Strictly prevents notifications from leaking or broadcasting to recent/unrelated users.
 */
export async function resolveEncounterCareTeam(encounterId: string): Promise<ResolvedCareTeam | null> {
  const [enc] = await db
    .select({
      id: encounters.id,
      patientId: encounters.patientId,
      clinicianId: encounters.clinicianId,
      assignedNurseId: encounters.assignedNurseId,
      patientUserId: patients.userId,
    })
    .from(encounters)
    .leftJoin(patients, eq(encounters.patientId, patients.id))
    .where(eq(encounters.id, encounterId))
    .limit(1);

  if (!enc) return null;

  // Resolve additional multidisciplinary care team members if linked
  const teamMembers = await db
    .select({ userId: careTeamMembers.userId })
    .from(careTeams)
    .innerJoin(careTeamMembers, eq(careTeams.id, careTeamMembers.careTeamId))
    .where(eq(careTeams.patientId, enc.patientId));

  const additionalMemberIds = teamMembers
    .map((m) => m.userId)
    .filter((id) => id !== enc.clinicianId && id !== enc.assignedNurseId);

  return {
    encounterId: enc.id,
    patientId: enc.patientId,
    patientUserId: enc.patientUserId || null,
    attendingDoctorId: enc.clinicianId,
    assignedNurseId: enc.assignedNurseId || null,
    careTeamMemberIds: additionalMemberIds,
  };
}

/**
 * Dispatches targeted order notifications strictly to the encounter's care team and patient portal.
 */
export async function dispatchOrderResultNotification(order: {
  id: string;
  encounterId: string;
  testName: string;
  patientId: string;
  isCritical?: boolean;
  priority?: "low" | "normal" | "high" | "critical";
  status?: string;
}) {
  const careTeam = await resolveEncounterCareTeam(order.encounterId);
  if (!careTeam) {
    console.warn(`[CareTeamResolver] Unable to resolve encounter care team for encounter ${order.encounterId}`);
    return;
  }

  const isCritical = order.isCritical || order.priority === "critical";

  // 1. Notify the Attending Clinician specifically
  await dispatchNotification({
    category: "orders",
    type: isCritical ? "critical_order_alert" : "order_result_available",
    title: `${isCritical ? "🚨 CRITICAL VALUE: " : "📋 Result Ready: "}${order.testName}`,
    body: isCritical
      ? `CRITICAL panic value detected for patient. Immediate clinical intervention required.`
      : `Diagnostic test ${order.testName} has been verified and is ready for physician review.`,
    priority: isCritical ? "critical" : "high",
    recipientUserId: careTeam.attendingDoctorId,
    actionUrl: `/encounters/${order.encounterId}`,
    actionText: "Review Result",
    relatedEntityType: "clinical_orders",
    relatedEntityId: order.id,
  });

  // 2. Notify Assigned Nurse if present
  if (careTeam.assignedNurseId) {
    await dispatchNotification({
      category: "orders",
      type: "order_update_nurse",
      title: `${isCritical ? "🚨 CRITICAL: " : "📋 "}Order Update: ${order.testName}`,
      body: `Diagnostic order status updated to '${order.status || "verified"}' for patient under your care.`,
      priority: isCritical ? "critical" : "normal",
      recipientUserId: careTeam.assignedNurseId,
      actionUrl: `/encounters/${order.encounterId}`,
      actionText: "Open Encounter",
      relatedEntityType: "clinical_orders",
      relatedEntityId: order.id,
    });
  }

  // 3. Notify Patient Portal (Only if non-critical to allow physician counseling first)
  if (careTeam.patientUserId && !isCritical) {
    await dispatchNotification({
      category: "orders",
      type: "patient_lab_ready",
      title: `Diagnostic Update: ${order.testName}`,
      body: `Your diagnostic results for ${order.testName} have been verified and added to your health records.`,
      priority: "normal",
      recipientUserId: careTeam.patientUserId,
      actionUrl: `/patient/records`,
      actionText: "View My Results",
      relatedEntityType: "clinical_orders",
      relatedEntityId: order.id,
    });
  }
}
