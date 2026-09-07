import { notificationBus } from "@/lib/notifications/notification-service";

export interface ConfigChangeEvent {
  type: "config_invalidation";
  resource: string;
  action: "created" | "updated" | "deleted";
  timestamp: string;
  data?: any;
}

export function broadcastConfigChange(resource: string, action: "created" | "updated" | "deleted" = "updated", data?: any) {
  try {
    const payload: ConfigChangeEvent = {
      type: "config_invalidation",
      resource,
      action,
      timestamp: new Date().toISOString(),
      data,
    };
    notificationBus.emit("config_change", payload);
    // Also broadcast on general notification channel so any client SSE receives it
    notificationBus.emit("notification", {
      type: "config_invalidation",
      resource,
      action,
      timestamp: payload.timestamp,
    });
  } catch (err) {
    console.error(`[ConfigEvents] Failed to broadcast config change for ${resource}:`, err);
  }
}
