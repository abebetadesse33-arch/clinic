/**
 * WebSocket Server - Real-time Communication Infrastructure
 * Handles live notifications, collaborative features, and instant updates
 */

import { EventEmitter } from "events";

export interface WebSocketConnection {
  id: string;
  userId: string;
  organizationId: string;
  roles: string[];
  createdAt: Date;
  lastHeartbeat: Date;
}

export interface RealtimeMessage {
  id: string;
  type:
    | "notification"
    | "status_update"
    | "patient_alert"
    | "appointment_change"
    | "document_shared"
    | "message"
    | "typing_indicator"
    | "presence_update"
    | "collaboration_event";
  recipientId?: string;
  recipientRole?: string;
  organizationId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  priority?: "low" | "normal" | "high" | "critical";
}

export interface PresenceUpdate {
  userId: string;
  status: "online" | "offline" | "away" | "in_call";
  lastSeen?: Date;
  currentPage?: string;
}

/**
 * In-memory WebSocket connection manager
 * Can be extended with Redis for distributed deployments
 */
export class WebSocketServer extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> connection IDs
  private messageQueues: Map<string, RealtimeMessage[]> = new Map(); // user -> messages
  private presence: Map<string, PresenceUpdate> = new Map(); // userId -> presence

  constructor() {
    super();
    this.startHeartbeatMonitor();
  }

  /**
   * Register a WebSocket connection
   */
  registerConnection(
    connectionId: string,
    userId: string,
    organizationId: string,
    roles: string[]
  ): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: connectionId,
      userId,
      organizationId,
      roles,
      createdAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.connections.set(connectionId, connection);
    this.emit("connection:registered", connection);

    // Auto-subscribe to personal channel
    this.subscribe(connectionId, `user:${userId}`);
    this.subscribe(connectionId, `org:${organizationId}`);

    // Add role-based subscriptions
    roles.forEach((role) => {
      this.subscribe(connectionId, `role:${role}:${organizationId}`);
    });

    return connection;
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Unsubscribe from all channels
    this.subscriptions.forEach((connectionIds) => {
      connectionIds.delete(connectionId);
    });

    this.connections.delete(connectionId);
    this.emit("connection:unregistered", connection);
  }

  /**
   * Subscribe connection to a channel
   */
  subscribe(connectionId: string, channel: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(connectionId);
    this.emit("subscription:added", { connectionId, channel });
  }

  /**
   * Unsubscribe connection from a channel
   */
  unsubscribe(connectionId: string, channel: string): void {
    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(connectionId);
    }
  }

  /**
   * Broadcast message to channel subscribers
   */
  broadcastToChannel(channel: string, message: RealtimeMessage): number {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return 0;

    let count = 0;
    subscribers.forEach((connectionId) => {
      this.queueMessageForConnection(connectionId, message);
      count++;
    });

    this.emit("message:broadcast", { channel, messageId: message.id, recipientCount: count });
    return count;
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, message: RealtimeMessage): number {
    const channel = `user:${userId}`;
    return this.broadcastToChannel(channel, message);
  }

  /**
   * Send message to specific role within organization
   */
  sendToRole(organizationId: string, role: string, message: RealtimeMessage): number {
    const channel = `role:${role}:${organizationId}`;
    return this.broadcastToChannel(channel, message);
  }

  /**
   * Queue message for offline delivery
   */
  private queueMessageForConnection(connectionId: string, message: RealtimeMessage): void {
    if (!this.messageQueues.has(connectionId)) {
      this.messageQueues.set(connectionId, []);
    }
    this.messageQueues.get(connectionId)!.push(message);
  }

  /**
   * Get queued messages for a connection
   */
  getQueuedMessages(connectionId: string): RealtimeMessage[] {
    const messages = this.messageQueues.get(connectionId) || [];
    this.messageQueues.delete(connectionId);
    return messages;
  }

  /**
   * Update presence information
   */
  updatePresence(userId: string, update: Partial<PresenceUpdate>): void {
    const current = this.presence.get(userId) || { userId, status: "online" };
    const updated = { ...current, ...update, userId };
    this.presence.set(userId, updated);

    // Broadcast presence update to organization
    const connection = Array.from(this.connections.values()).find(
      (c) => c.userId === userId
    );
    if (connection) {
      this.broadcastToChannel(`org:${connection.organizationId}`, {
        id: `presence-${Date.now()}`,
        type: "presence_update",
        organizationId: connection.organizationId,
        data: updated,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get presence info for user
   */
  getPresence(userId: string): PresenceUpdate | undefined {
    return this.presence.get(userId);
  }

  /**
   * Get all presence info for organization
   */
  getOrganizationPresence(organizationId: string): PresenceUpdate[] {
    const presences: PresenceUpdate[] = [];
    this.connections.forEach((conn) => {
      if (conn.organizationId === organizationId) {
        const presence = this.presence.get(conn.userId);
        if (presence) presences.push(presence);
      }
    });
    return presences;
  }

  /**
   * Heartbeat monitoring - remove stale connections
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute

      this.connections.forEach((connection, connectionId) => {
        const timeSinceHeartbeat =
          now.getTime() - connection.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > timeout) {
          this.unregisterConnection(connectionId);
          this.emit("connection:timeout", connection);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Send heartbeat signal
   */
  sendHeartbeat(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.lastHeartbeat = new Date();
    return true;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
      channels: this.subscriptions.size,
      onlineUsers: new Set(Array.from(this.connections.values()).map((c) => c.userId))
        .size,
    };
  }
}

// Singleton instance
export const wsServer = new WebSocketServer();
