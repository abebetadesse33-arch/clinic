/**
 * useRealtimeUpdates - React Hook for Real-time Messaging
 * Handles WebSocket connections and automatic reconnection
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface RealtimeHookOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  channels?: string[];
}

export function useRealtimeUpdates(options: RealtimeHookOptions = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    channels = [],
  } = options;

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reconnectAttempts = useRef(0);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // Connect to real-time server
  const connect = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/realtime", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      const data = await response.json();
      setConnectionId(data.connectionId);
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;

      // Load queued messages
      if (data.queuedMessages?.length > 0) {
        setMessages((prev) => [...prev, ...data.queuedMessages]);
      }

      // Start heartbeat
      startHeartbeat(data.connectionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setConnected(false);

      // Attempt reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, reconnectInterval);
      }
    }
  }, [reconnectInterval, maxReconnectAttempts]);

  // Send heartbeat
  const startHeartbeat = useCallback((conId: string) => {
    heartbeatTimer.current = setInterval(async () => {
      try {
        await fetch("/api/v1/realtime", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId: conId }),
        });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Send message
  const sendMessage = useCallback(
    async (payload: {
      type: string;
      channel?: string;
      recipientId?: string;
      recipientRole?: string;
      data: Record<string, unknown>;
      priority?: string;
    }) => {
      if (!connectionId) {
        throw new Error("Not connected");
      }

      try {
        const response = await fetch("/api/v1/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, ...payload }),
        });

        if (!response.ok) {
          throw new Error(`Send failed: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        console.error("Failed to send message:", err);
        throw err;
      }
    },
    [connectionId]
  );

  // Disconnect
  const disconnect = useCallback(async () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    if (connectionId) {
      try {
        await fetch("/api/v1/realtime", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId }),
        });
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    }

    setConnected(false);
    setConnectionId(null);
  }, [connectionId]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionId,
    connected,
    messages,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}

/**
 * usePresence - React Hook for Presence Updates
 */
export function usePresence(organizationId: string) {
  const [presence, setPresence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const realtime = useRealtimeUpdates();

  useEffect(() => {
    if (!realtime.connected) return;

    // Subscribe to presence updates
    const handlePresenceUpdate = async () => {
      try {
        const response = await fetch(
          `/api/v1/realtime/presence?organizationId=${organizationId}`
        );
        const data = await response.json();
        setPresence(data.presence || []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch presence:", err);
        setLoading(false);
      }
    };

    handlePresenceUpdate();
  }, [realtime.connected, organizationId]);

  return { presence, loading };
}
