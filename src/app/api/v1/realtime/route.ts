/**
 * Real-time Messaging API Endpoint
 * Handles WebSocket connection upgrades and HTTP polling fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/security/auth-session";
import { wsServer } from "@/lib/realtime/websocket-server";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

/**
 * GET /api/v1/realtime/connect
 * Establishes real-time connection and returns connection ID
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionId = uuidv4();
    const organizationId = req.headers.get("x-organization-id") || session.organizationId;
    const roles = session.roles || [];

    // Register the connection
    const connection = wsServer.registerConnection(
      connectionId,
      session.userId,
      organizationId,
      roles
    );

    // Get any queued messages
    const queuedMessages = wsServer.getQueuedMessages(connectionId);

    return NextResponse.json({
      success: true,
      connectionId,
      connection,
      queuedMessages,
      stats: wsServer.getStats(),
    });
  } catch (error) {
    console.error("Connection error:", error);
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}

/**
 * POST /api/v1/realtime/message
 * Send message to specific channel or user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      connectionId,
      type,
      channel,
      recipientId,
      recipientRole,
      data,
      priority = "normal",
    } = body;

    if (!type) {
      return NextResponse.json({ error: "Message type required" }, { status: 400 });
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      recipientId,
      recipientRole,
      organizationId: session.organizationId,
      data: {
        ...data,
        senderUserId: session.userId,
        senderRole: session.roles?.[0],
      },
      timestamp: new Date(),
      priority,
    };

    let recipientCount = 0;

    // Broadcast to channel if specified
    if (channel) {
      recipientCount = wsServer.broadcastToChannel(channel, message);
    }
    // Send to specific user
    else if (recipientId) {
      recipientCount = wsServer.sendToUser(recipientId, message);
    }
    // Send to role
    else if (recipientRole) {
      recipientCount = wsServer.sendToRole(
        session.organizationId,
        recipientRole,
        message
      );
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      recipientCount,
      message,
    });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/realtime/heartbeat
 * Keep connection alive
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID required" }, { status: 400 });
    }

    const success = wsServer.sendHeartbeat(connectionId);
    if (!success) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      stats: wsServer.getStats(),
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/realtime/disconnect
 * Close connection
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID required" }, { status: 400 });
    }

    wsServer.unregisterConnection(connectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
