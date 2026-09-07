import { db } from "@/db";
import {
  notifications,
  users,
  patients,
  careTeamMembers,
  telegramIntegrations,
  notificationPrivileges,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendTelegramNotification, sendBatchTelegramNotifications } from "./telegram-notifier";
import { EventEmitter } from "events";

export type NotificationCategory =
  | "appointments"
  | "orders"
  | "billing"
  | "clinical_alerts"
  | "auth_shifts"
  | "system";

export interface NotificationDispatchPayload {
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string;
  actionText?: string;
  recipientUserId?: string;
  recipientUserIds?: string[];
  participantPatientId?: string;
  excludeUserIds?: string[];
  targetRole?: string;
  targetDepartment?: string;
  senderUserId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
}

// Global real-time event bus for SSE client broadcasting
class NotificationEventBus extends EventEmitter {}
export const notificationBus = new NotificationEventBus();
notificationBus.setMaxListeners(200);

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Dispatches a real-time notification with role privileges, deep action links, and Telegram delivery.
 */
export async function dispatchNotification(payload: NotificationDispatchPayload): Promise<{
  success: boolean;
  recipientCount: number;
  telegramCount: number;
  notificationIds: string[];
}> {
  try {
    const priority = payload.priority || "normal";
    const actionUrl = payload.actionUrl;
    const actionText = payload.actionText || "View Details";

    // 1. Resolve Target Users
    const recipientUserIds: string[] = [];

    if (payload.recipientUserId && payload.recipientUserId.length === 36) {
      recipientUserIds.push(payload.recipientUserId);
    }

    if (payload.recipientUserIds) {
      payload.recipientUserIds
        .filter((id) => id.length === 36)
        .forEach((id) => {
          if (!recipientUserIds.includes(id)) recipientUserIds.push(id);
        });
    }

    if (payload.participantPatientId && payload.participantPatientId.length === 36) {
      const [patient] = await db
        .select({ userId: patients.userId, primaryDoctorId: patients.primaryDoctorId })
        .from(patients)
        .where(eq(patients.id, payload.participantPatientId))
        .limit(1);

      if (patient?.userId) recipientUserIds.push(patient.userId);
      if (patient?.primaryDoctorId) recipientUserIds.push(patient.primaryDoctorId);

      const careTeam = await db
        .select({ userId: careTeamMembers.userId })
        .from(careTeamMembers)
        .where(eq(careTeamMembers.patientId, payload.participantPatientId));

      careTeam.forEach(({ userId }) => recipientUserIds.push(userId));
    }

    if (payload.targetRole) {
      // Check if this category is enabled for this role in notification_privileges
      const [priv] = await db
        .select()
        .from(notificationPrivileges)
        .where(
          and(
            eq(notificationPrivileges.role, payload.targetRole),
            eq(notificationPrivileges.category, payload.category)
          )
        )
        .limit(1);

      // If explicitly disabled by Admin, don't dispatch to this role
      if (priv && !priv.isEnabled) {
        console.log(`[NotificationService] Category '${payload.category}' disabled for role '${payload.targetRole}'`);
        return { success: true, recipientCount: 0, telegramCount: 0, notificationIds: [] };
      }

      // Fetch users with target role
      const matchedUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, payload.targetRole as any))
        .limit(50);

      matchedUsers.forEach((u) => {
        if (!recipientUserIds.includes(u.id)) {
          recipientUserIds.push(u.id);
        }
      });
    }

    const excluded = new Set(payload.excludeUserIds || []);
    if (payload.senderUserId) excluded.add(payload.senderUserId);
    const uniqueRecipientUserIds = Array.from(new Set(recipientUserIds)).filter((id) => !excluded.has(id));
    recipientUserIds.length = 0;
    recipientUserIds.push(...uniqueRecipientUserIds);

    // Safety check: Prevent State Leaks by NEVER defaulting to a random/newest user in the database.
    // If no recipients resolved, route exclusively to system_admin role if available.
    if (recipientUserIds.length === 0) {
      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "system_admin" as any))
        .limit(5);

      if (adminUsers.length > 0) {
        adminUsers.forEach((u) => recipientUserIds.push(u.id));
      } else {
        console.warn(`[NotificationService] No recipient resolved for notification "${payload.title}". Skipping to prevent leak.`);
      }
    }

    // 2. Insert Database Records for Each Recipient
    const insertedIds: string[] = [];

    for (const userId of recipientUserIds) {
      // Explicit DB Insertion: Strictly stores senderUserId in the database schema column
      const [inserted] = await db
        .insert(notifications)
        .values({
          organizationId: DEFAULT_TENANT_ID,
          userId: userId,
          recipientUserId: userId,
          senderUserId: payload.senderUserId || null,
          title: payload.title,
          message: payload.body,
          body: payload.body,
          type: (payload.type as any) || "system_alert",
          priority: priority as any,
          isRead: false,
          actionUrl,
          actionText,
          targetRole: payload.targetRole || null,
          targetDepartment: payload.targetDepartment || null,
          relatedEntityType: payload.relatedEntityType || null,
          relatedEntityId: payload.relatedEntityId || null,
          metadata: {
            ...payload.metadata,
            category: payload.category,
            actionText,
            senderUserId: payload.senderUserId || null,
          },
        })
        .returning({ id: notifications.id });

      if (inserted?.id) {
        insertedIds.push(inserted.id);

        // Broadcast to in-memory Real-Time SSE listeners with verified senderUserId
        notificationBus.emit("notification", {
          id: inserted.id,
          recipientUserId: userId,
          senderUserId: payload.senderUserId || null,
          targetRole: payload.targetRole,
          category: payload.category,
          title: payload.title,
          body: payload.body,
          priority: priority,
          actionUrl,
          actionText,
          relatedEntityType: payload.relatedEntityType,
          relatedEntityId: payload.relatedEntityId,
          metadata: payload.metadata || {},
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Multi-Channel Dispatch: Deliver to Telegram for linked accounts
    let telegramCount = 0;
    try {
      if (recipientUserIds.length > 0) {
        const telegramLinks = await db
          .select()
          .from(telegramIntegrations)
          .where(
            and(
              inArray(telegramIntegrations.userId, recipientUserIds),
              eq(telegramIntegrations.isNotificationsEnabled, true)
            )
          );

        const telegramPayloads = telegramLinks
          .filter((link) => Boolean(link.telegramChatId))
          .map((link) => ({
            chatId: link.telegramChatId,
            title: payload.title,
            body: payload.body,
            priority: priority,
            actionUrl,
            actionText,
            isMiniApp: Boolean(actionUrl && actionUrl.startsWith("/")),
          }));

        if (telegramPayloads.length > 0) {
          const batchResult = await sendBatchTelegramNotifications(telegramPayloads, {
            concurrency: 12,
            delayBetweenChunksMs: 80,
          });
          telegramCount = batchResult.sent;
        }
      }
    } catch (telegramErr) {
      console.warn("[NotificationService] Telegram notification dispatch non-fatal note:", telegramErr);
    }

    return {
      success: true,
      recipientCount: recipientUserIds.length,
      telegramCount,
      notificationIds: insertedIds,
    };
  } catch (err: any) {
    console.error("[NotificationService] Dispatch error:", err);
    return { success: false, recipientCount: 0, telegramCount: 0, notificationIds: [] };
  }
}

export async function dispatchParticipantNotification(
  payload: Omit<NotificationDispatchPayload, "participantPatientId" | "recipientUserIds"> & {
    patientId: string;
    recipientUserIds?: string[];
  }
) {
  return dispatchNotification({
    ...payload,
    participantPatientId: payload.patientId,
    recipientUserIds: payload.recipientUserIds,
  });
}
