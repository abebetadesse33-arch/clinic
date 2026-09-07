import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq, desc, and, inArray, or } from "drizzle-orm";
import { getAuthenticatedSessionUser, requireAuthenticatedUser } from "@/lib/security/auth-session";
import type { NotificationPriority } from "@/lib/types/clinical";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const sessionUser = auth.user;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || sessionUser.role;
    const category = searchParams.get("category");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const priority = searchParams.get("priority") as NotificationPriority | null;
    const limit = parseInt(searchParams.get("limit") ?? "60", 10);

    const conditions: any[] = [];
    const isSystemAdmin = sessionUser.role === "system_admin" || sessionUser.role === "tenant_admin";

    if (!isSystemAdmin) {
      conditions.push(eq(notifications.recipientUserId, sessionUser.id));
      if (role) {
        conditions.push(eq(notifications.targetRole, role));
      }
    } else if (role && searchParams.get("filterRole")) {
      conditions.push(eq(notifications.targetRole, searchParams.get("filterRole")!));
    }

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    if (priority) {
      conditions.push(eq(notifications.priority, priority as any));
    }

    let query = db.select().from(notifications);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(notifications.createdAt)).limit(limit);

    // Resolve sender user details from database for all unique senderUserIds
    const senderIds = Array.from(new Set(rows.map((r) => r.senderUserId).filter((id): id is string => Boolean(id))));
    const senderMap = new Map<string, { fullName: string; role: string }>();

    if (senderIds.length > 0) {
      const senderRows = await db
        .select({ id: users.id, fullName: users.fullName, role: users.role })
        .from(users)
        .where(inArray(users.id, senderIds));

      senderRows.forEach((u) => senderMap.set(u.id, { fullName: u.fullName, role: u.role }));
    }

    const formatted = rows.map((r) => {
      const sender = r.senderUserId ? senderMap.get(r.senderUserId) : undefined;
      return {
        id: r.id,
        organizationId: r.organizationId,
        recipientUserId: r.recipientUserId,
        senderUserId: r.senderUserId,
        senderName: sender?.fullName || null,
        senderRole: sender?.role || null,
        type: r.type,
        title: r.title,
        body: r.body || (r as any).message || "",
        priority: r.priority || "normal",
        isRead: r.isRead,
        actionUrl: r.actionUrl,
        actionText: (r as any).actionText || "Act Now",
        targetRole: (r as any).targetRole || null,
        targetDepartment: (r as any).targetDepartment || null,
        relatedEntityType: r.relatedEntityType,
        relatedEntityId: r.relatedEntityId,
        metadata: r.metadata,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        readAt: r.readAt ? new Date(r.readAt).toISOString() : null,
      };
    });

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      data: {
        notifications: formatted,
        total: formatted.length,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch notifications from DB:", error);
    return NextResponse.json({
      success: true,
      data: {
        notifications: [],
        total: 0,
        unreadCount: 0,
      },
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean };
    const currentUserId = auth.user.id;

    if (markAllRead) {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.recipientUserId, currentUserId));
      return NextResponse.json({ success: true, data: { markedRead: true } });
    }

    if (ids && ids.length > 0) {
      const validUuids = ids.filter((id) => id.length === 36 && id.includes("-"));
      if (validUuids.length > 0) {
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(and(inArray(notifications.id, validUuids), eq(notifications.recipientUserId, currentUserId)));
      }
      return NextResponse.json({ success: true, data: { markedRead: validUuids.length } });
    }

    return NextResponse.json({ success: false, error: "ids or markAllRead required" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to mark notifications read:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const sessionUserId = auth.user.id;
    const body = await request.json();
    const {
      recipientUserId,
      type,
      title,
      body: msgBody,
      priority = "normal",
      actionUrl,
      actionText,
      targetRole,
      targetDepartment,
      relatedEntityType,
      relatedEntityId,
      metadata = {},
    } = body;

    if (!type || !title || !msgBody) {
      return NextResponse.json(
        { success: false, error: "type, title, and body are required" },
        { status: 400 }
      );
    }

    // Enforce server session identity: the authenticated session user is the only sender actor.
    const effectiveSenderUserId = sessionUserId;

    // Route through the central dispatch (handles SSE bus + Telegram + DB)
    const { dispatchNotification } = await import("@/lib/notifications/notification-service");
    await dispatchNotification({
      category: (type.split("_")[0] as any) || "system",
      type,
      title,
      body: msgBody,
      priority: priority ?? "normal",
      recipientUserId: recipientUserId || undefined,
      senderUserId: effectiveSenderUserId,
      targetRole: targetRole || undefined,
      targetDepartment: targetDepartment || undefined,
      actionUrl: actionUrl || undefined,
      actionText: actionText || undefined,
      relatedEntityType: relatedEntityType || undefined,
      relatedEntityId: relatedEntityId || undefined,
      metadata,
    });

    return NextResponse.json({ success: true, data: { dispatched: true } }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to dispatch notification:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

