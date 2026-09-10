/**
 * ═══════════════════════════════════════════════════════════════════
 * APPOINTMENT REMINDER SERVICE
 * ═══════════════════════════════════════════════════════════════════
 * Proactively scans for upcoming appointments and dispatches real-time
 * reminders via the SSE notification bus.
 *
 * Reminder windows:
 *   - 24 hours before: early heads-up for patient + clinician
 *   -  1 hour before:  urgent reminder for both parties
 * ═══════════════════════════════════════════════════════════════════
 */

import { db } from "@/db";
import { appointments, patients, users } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { dispatchNotification } from "./notification-service";

// In-memory dedup set: tracks "appointmentId|window" to avoid duplicate dispatches
// Resets on server restart (acceptable for a cron-driven approach)
const dispatched = new Set<string>();

type ReminderWindow = "24h" | "1h";

interface ReminderCandidate {
  appointmentId: string;
  patientUserId: string | null;
  clinicianId: string | null;
  patientName: string;
  clinicianName: string;
  scheduledDate: string;
  scheduledTime: string | null;
  appointmentType: string;
  reason: string | null;
}

function buildDedupeKey(appointmentId: string, window: ReminderWindow) {
  return `${appointmentId}|${window}`;
}

function formatApptTime(date: string, time: string | null): string {
  try {
    const d = new Date(`${date}T${time || "00:00"}:00`);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return `${date} ${time || ""}`.trim();
  }
}

async function fetchUpcomingAppointments(
  fromMinutes: number,
  toMinutes: number
): Promise<ReminderCandidate[]> {
  const now = new Date();
  const from = new Date(now.getTime() + fromMinutes * 60 * 1000);
  const to = new Date(now.getTime() + toMinutes * 60 * 1000);

  // Convert to date strings for comparison (YYYY-MM-DD)
  const fromDate = from.toISOString().split("T")[0];
  const toDate = to.toISOString().split("T")[0];

  try {
    const rows = await db
      .select({
        id: appointments.id,
        clinicianId: appointments.clinicianId,
        patientId: appointments.patientId,
        scheduledDate: appointments.scheduledDate,
        scheduledTime: appointments.scheduledTime,
        appointmentType: appointments.appointmentType,
        reason: appointments.reason,
        status: appointments.status,
        patientUserId: patients.userId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        clinicianName: users.fullName,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.clinicianId, users.id))
      .where(
        and(
          inArray(appointments.status as any, ["scheduled", "confirmed"]),
          gte(appointments.scheduledDate as any, fromDate),
          lte(appointments.scheduledDate as any, toDate)
        )
      )
      .limit(100);

    return rows
      .filter((r) => {
        // Verify the actual datetime is within our window
        const apptDt = new Date(`${r.scheduledDate}T${r.scheduledTime || "00:00"}:00`);
        return apptDt >= from && apptDt <= to;
      })
      .map((r) => ({
        appointmentId: r.id,
        patientUserId: r.patientUserId || null,
        clinicianId: r.clinicianId ?? null,
        patientName: `${r.patientFirstName || ""} ${r.patientLastName || ""}`.trim() || "Patient",
        clinicianName: r.clinicianName || "Your Provider",
        scheduledDate: r.scheduledDate as string,
        scheduledTime: r.scheduledTime as string | null,
        appointmentType: r.appointmentType || "visit",
        reason: r.reason || null,
      }));
  } catch (err) {
    console.error("[ReminderService] DB query error:", err);
    return [];
  }
}

async function dispatchReminderPair(
  candidate: ReminderCandidate,
  window: ReminderWindow
) {
  const key = buildDedupeKey(candidate.appointmentId, window);
  if (dispatched.has(key)) return;
  dispatched.add(key);

  const timeStr = formatApptTime(candidate.scheduledDate, candidate.scheduledTime);
  const windowLabel = window === "24h" ? "tomorrow" : "in about 1 hour";
  const isUrgent = window === "1h";
  const priority = isUrgent ? "high" : "normal";
  const actionUrl = `/appointments?highlight=${candidate.appointmentId}`;

  // Notify patient
  if (candidate.patientUserId) {
    await dispatchNotification({
      category: "appointments",
      type: "appointment_reminder",
      title: isUrgent
        ? `⏰ Appointment in ~1 Hour`
        : `📅 Appointment Reminder — Tomorrow`,
      body: `Your ${candidate.appointmentType} appointment with ${candidate.clinicianName} is ${windowLabel} at ${timeStr}.${candidate.reason ? ` Reason: ${candidate.reason}.` : ""}`,
      priority,
      recipientUserId: candidate.patientUserId,
      actionUrl,
      actionText: "View Appointment",
      relatedEntityType: "appointment",
      relatedEntityId: candidate.appointmentId,
      metadata: { appointmentId: candidate.appointmentId, window },
    });
  }

  // Notify clinician
  if (candidate.clinicianId) {
    await dispatchNotification({
      category: "appointments",
      type: "appointment_reminder",
      title: isUrgent
        ? `⏰ Patient Appointment in ~1 Hour`
        : `📅 Upcoming Appointment — Tomorrow`,
      body: `You have a ${candidate.appointmentType} appointment with ${candidate.patientName} ${windowLabel} at ${timeStr}.`,
      priority,
      recipientUserId: candidate.clinicianId,
      actionUrl,
      actionText: "View Schedule",
      relatedEntityType: "appointment",
      relatedEntityId: candidate.appointmentId,
      metadata: { appointmentId: candidate.appointmentId, window },
    });
  }
}

/**
 * Main entry point: checks upcoming appointments and dispatches reminders.
 * Safe to call repeatedly — uses in-memory deduplication.
 */
export async function checkAndDispatchAppointmentReminders(): Promise<{
  checked24h: number;
  checked1h: number;
  dispatched: number;
}> {
  let totalDispatched = 0;

  // 24-hour window: 23h–25h from now
  const candidates24h = await fetchUpcomingAppointments(23 * 60, 25 * 60);
  for (const c of candidates24h) {
    const before = dispatched.size;
    await dispatchReminderPair(c, "24h");
    if (dispatched.size > before) totalDispatched++;
  }

  // 1-hour window: 50–70 minutes from now
  const candidates1h = await fetchUpcomingAppointments(50, 70);
  for (const c of candidates1h) {
    const before = dispatched.size;
    await dispatchReminderPair(c, "1h");
    if (dispatched.size > before) totalDispatched++;
  }

  return {
    checked24h: candidates24h.length,
    checked1h: candidates1h.length,
    dispatched: totalDispatched,
  };
}
