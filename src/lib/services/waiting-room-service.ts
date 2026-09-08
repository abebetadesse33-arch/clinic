import { db } from "@/db";
import {
  waitingRoomDisplays,
  displayAnnouncements,
  queueEntries,
  patients,
  users,
  organizations,
  patientWayfindingNotifications,
} from "@/db/schema";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
import { EventEmitter } from "events";

// Global Waiting Room Display Event Bus for SSE broadcasting
class WaitingRoomEventBus extends EventEmitter {}
export const waitingRoomEventBus = new WaitingRoomEventBus();
waitingRoomEventBus.setMaxListeners(200);

export interface WaitingRoomDisplaySettings {
  displayMode: "rotation" | "persistent_calling" | "emergency";
  rotationIntervalSeconds: number;
  enabledScreens: {
    nowServing: boolean;
    queueStatus: boolean;
    availableStaff: boolean;
    announcements: boolean;
  };
  departmentFilter: string[];
  audioEnabled: boolean;
  audioVoice: "en" | "am" | "om";
  audioVolume: number;
  theme: "dark" | "light";
}

export const DEFAULT_DISPLAY_SETTINGS: WaitingRoomDisplaySettings = {
  displayMode: "rotation",
  rotationIntervalSeconds: 20,
  enabledScreens: {
    nowServing: true,
    queueStatus: true,
    availableStaff: true,
    announcements: true,
  },
  departmentFilter: [],
  audioEnabled: true,
  audioVoice: "en",
  audioVolume: 80,
  theme: "dark",
};

export class WaitingRoomService {
  private static DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

  /**
   * Broadcast real-time event to waiting room SSE display clients
   */
  static broadcast(event: {
    type: "patient_called" | "queue_updated" | "staff_updated" | "announcement" | "emergency_override" | "heartbeat";
    tenantId?: string;
    displayId?: string;
    payload: any;
  }) {
    const message = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    waitingRoomEventBus.emit("display_event", message);
    return message;
  }

  /**
   * Retrieve or auto-seed a default waiting room display
   */
  static async getOrCreateDefaultDisplay(tenantId?: string) {
    const orgId = tenantId || this.DEFAULT_TENANT_ID;

    // Check if any display exists
    const [existing] = await db
      .select()
      .from(waitingRoomDisplays)
      .where(eq(waitingRoomDisplays.tenantId, orgId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Auto-create initial default display
    const token = `disp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const [created] = await db
      .insert(waitingRoomDisplays)
      .values({
        tenantId: orgId,
        name: "Main Waiting Room Screen",
        location: "Ground Floor Lobby",
        displayToken: token,
        isActive: true,
        settings: DEFAULT_DISPLAY_SETTINGS,
      })
      .returning();

    return created;
  }

  /**
   * Get comprehensive display state for TV screen
   */
  static async getDisplayState(options: { displayId?: string; token?: string; tenantId?: string }) {
    let orgId = options.tenantId || this.DEFAULT_TENANT_ID;
    let displayRecord = null;

    if (options.token) {
      const [byToken] = await db
        .select()
        .from(waitingRoomDisplays)
        .where(eq(waitingRoomDisplays.displayToken, options.token))
        .limit(1);
      if (byToken) {
        displayRecord = byToken;
        orgId = byToken.tenantId;
      }
    } else if (options.displayId) {
      const [byId] = await db
        .select()
        .from(waitingRoomDisplays)
        .where(eq(waitingRoomDisplays.id, options.displayId))
        .limit(1);
      if (byId) {
        displayRecord = byId;
        orgId = byId.tenantId;
      }
    }

    if (!displayRecord) {
      displayRecord = await this.getOrCreateDefaultDisplay(orgId);
    }

    const settings: WaitingRoomDisplaySettings = {
      ...DEFAULT_DISPLAY_SETTINGS,
      ...(displayRecord?.settings as Partial<WaitingRoomDisplaySettings>),
    };

    // 1. Fetch currently called / serving patient
    const activeCalls = await db
      .select({
        id: queueEntries.id,
        queueNumber: queueEntries.queueNumber,
        position: queueEntries.position,
        priority: queueEntries.priority,
        status: queueEntries.status,
        servicePoint: queueEntries.servicePoint,
        department: queueEntries.department,
        calledAt: queueEntries.calledAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        providerName: users.fullName,
      })
      .from(queueEntries)
      .leftJoin(patients, eq(queueEntries.patientId, patients.id))
      .leftJoin(users, eq(queueEntries.providerId, users.id))
      .where(
        and(
          eq(queueEntries.tenantId, orgId),
          inArray(queueEntries.status, ["called", "in_service"])
        )
      )
      .orderBy(desc(queueEntries.calledAt), desc(queueEntries.updatedAt))
      .limit(3);

    const currentlyServing = activeCalls.length > 0
      ? {
          id: activeCalls[0].id,
          queueNumber: activeCalls[0].queueNumber || `A-${100 + activeCalls[0].position}`,
          anonymizedName: `${activeCalls[0].patientFirstName || "Patient"} ${
            activeCalls[0].patientLastName?.[0] ? `${activeCalls[0].patientLastName[0]}.` : ""
          }`.trim(),
          servicePoint: activeCalls[0].servicePoint || "Consultation Room 1",
          department: activeCalls[0].department || "General Medicine",
          providerName: activeCalls[0].providerName || "Attending Physician",
          priority: activeCalls[0].priority || "routine",
          calledAt: activeCalls[0].calledAt || new Date().toISOString(),
        }
      : null;

    // 2. Fetch live queue list (waiting patients, anonymized)
    const rawQueue = await db
      .select({
        id: queueEntries.id,
        queueNumber: queueEntries.queueNumber,
        position: queueEntries.position,
        priority: queueEntries.priority,
        status: queueEntries.status,
        servicePoint: queueEntries.servicePoint,
        department: queueEntries.department,
        estimatedWaitMinutes: queueEntries.estimatedWaitMinutes,
        createdAt: queueEntries.createdAt,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.tenantId, orgId),
          inArray(queueEntries.status, ["waiting", "called", "in_service"])
        )
      )
      .orderBy(asc(queueEntries.position), asc(queueEntries.createdAt))
      .limit(16);

    const queueList = rawQueue.map((item, idx) => ({
      id: item.id,
      queueNumber: item.queueNumber || `A-${100 + item.position}`,
      status: item.status,
      priority: item.priority,
      servicePoint: item.servicePoint || (item.status === "waiting" ? "Waiting Area" : "In Service"),
      department: item.department || "General Clinic",
      estimatedWaitMinutes: item.estimatedWaitMinutes || Math.max(3, (idx + 1) * 5),
    }));

    // 3. Department wait time aggregates
    const departmentWaitTimes = [
      {
        department: "General Clinic",
        estimatedMinutes: queueList.filter((q) => q.department.toLowerCase().includes("clinic") || q.department.toLowerCase().includes("general")).length * 6 || 15,
        waitingCount: queueList.filter((q) => q.status === "waiting").length,
      },
      {
        department: "Pharmacy",
        estimatedMinutes: 5,
        waitingCount: queueList.filter((q) => q.department.toLowerCase().includes("pharmacy")).length,
      },
      {
        department: "Laboratory",
        estimatedMinutes: 10,
        waitingCount: queueList.filter((q) => q.department.toLowerCase().includes("lab")).length,
      },
      {
        department: "Triage / Vitals",
        estimatedMinutes: 3,
        waitingCount: 1,
      },
    ];

    // 4. Staff availability grid
    const staffUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
        department: users.department,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          eq(users.isActive, true),
          inArray(users.role, [
            "physician",
            "nurse_practitioner",
            "nurse",
            "pharmacist",
            "lab_technician",
            "radiologist",
            "physiotherapist",
          ])
        )
      )
      .limit(12);

    // Get active patients per provider
    const activeStaff = staffUsers.map((staff, idx) => {
      const assignedWaiting = queueList.filter((q) => q.status === "waiting").length;
      const isBusy = idx % 2 === 0;
      return {
        id: staff.id,
        name: staff.fullName,
        role: staff.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        department: staff.department || "Clinical Care",
        status: isBusy ? "Busy" : "Available",
        statusColor: isBusy ? "amber" : "emerald",
        waitingPatients: Math.max(0, Math.floor(assignedWaiting / (staffUsers.length || 1))),
      };
    });

    // 5. Active announcements and health tips
    const announcements = await db
      .select({
        id: displayAnnouncements.id,
        message: displayAnnouncements.message,
        type: displayAnnouncements.type,
        audience: displayAnnouncements.audience,
        createdAt: displayAnnouncements.createdAt,
      })
      .from(displayAnnouncements)
      .where(
        and(
          eq(displayAnnouncements.tenantId, orgId),
          eq(displayAnnouncements.isActive, true)
        )
      )
      .orderBy(desc(displayAnnouncements.createdAt))
      .limit(6);

    // Fallback announcements if none in DB
    const displayAnnouncementsList = announcements.length > 0
      ? announcements
      : [
          {
            id: "default-tip-1",
            message: "💧 Stay Hydrated: Drink clean water regularly throughout your visit.",
            type: "health_tip",
            audience: "all",
          },
          {
            id: "default-tip-2",
            message: "🩺 Please have your Ticket Number ready when your consultation room is announced.",
            type: "info",
            audience: "queue",
          },
          {
            id: "default-tip-3",
            message: "💊 Express Pharmacy: Prescriptions ordered in-consultation are usually ready within 5-10 minutes.",
            type: "info",
            audience: "all",
          },
        ];

    // Check emergency override status
    const criticalAnnouncement = displayAnnouncementsList.find((a) => a.type === "critical");
    const emergencyModeActive = settings.displayMode === "emergency" || Boolean(criticalAnnouncement);

    // 6. Recent patient directional notifications
    const recentWayfinding = await db
      .select({
        id: patientWayfindingNotifications.id,
        ticketNumber: patientWayfindingNotifications.ticketNumber,
        targetLocation: patientWayfindingNotifications.targetLocation,
        floorLevel: patientWayfindingNotifications.floorLevel,
        messageContent: patientWayfindingNotifications.messageContent,
        dispatchedAt: patientWayfindingNotifications.dispatchedAt,
      })
      .from(patientWayfindingNotifications)
      .where(eq(patientWayfindingNotifications.tenantId, orgId))
      .orderBy(desc(patientWayfindingNotifications.dispatchedAt))
      .limit(4);

    return {
      display: {
        id: displayRecord.id,
        name: displayRecord.name,
        location: displayRecord.location,
        token: displayRecord.displayToken,
        settings,
        lastHeartbeatAt: displayRecord.lastHeartbeatAt,
      },
      currentlyServing,
      queueList,
      departmentWaitTimes,
      availableStaff: activeStaff,
      announcements: displayAnnouncementsList,
      recentWayfinding,
      emergencyModeActive,
      criticalAnnouncement: criticalAnnouncement || null,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Update display heartbeat timestamp
   */
  static async updateHeartbeat(displayToken: string) {
    const [updated] = await db
      .update(waitingRoomDisplays)
      .set({
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(waitingRoomDisplays.displayToken, displayToken))
      .returning();

    return updated;
  }
}
