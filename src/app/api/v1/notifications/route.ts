import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq, desc, and, inArray, or } from "drizzle-orm";
import type { NotificationRecord, NotificationPriority } from "@/lib/types/clinical";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || request.cookies.get("Nini_session")?.value;
    const role = searchParams.get("role");
    const category = searchParams.get("category");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const priority = searchParams.get("priority") as NotificationPriority | null;
    const limit = parseInt(searchParams.get("limit") ?? "60", 10);

    const conditions: any[] = [];
    const isSystemAdmin = role === "system_admin" || role === "tenant_admin";

    // If NOT system admin, filter strictly under respective privilege/role/user
    if (!isSystemAdmin) {
      if (userId && userId.length === 36 && role) {
        conditions.push(
          // @ts-ignore
          or(eq(notifications.recipientUserId, userId), eq(notifications.targetRole, role))
        );
      } else if (userId && userId.length === 36 && userId.includes("-")) {
        conditions.push(eq(notifications.recipientUserId, userId));
      } else if (role) {
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
    const body = await request.json();
    const { ids, markAllRead, userId } = body as { ids?: string[]; markAllRead?: boolean; userId?: string };

    if (markAllRead) {
      if (userId && userId.length === 36 && userId.includes("-")) {
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notifications.recipientUserId, userId));
      } else {
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() });
      }
      return NextResponse.json({ success: true, data: { markedRead: true } });
    }

    if (ids && ids.length > 0) {
      const validUuids = ids.filter((id) => id.length === 36 && id.includes("-"));
      if (validUuids.length > 0) {
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(inArray(notifications.id, validUuids));
      }
      return NextResponse.json({ success: true, data: { markedRead: ids.length } });
    }

    return NextResponse.json({ success: false, error: "ids or markAllRead required" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to mark notifications read:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = request.cookies.get("Nini_session")?.value;
    const body = await request.json();
    const {
      recipientUserId,
      senderUserId,
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

    // Enforce server session identity: Server session takes priority over client-supplied senderUserId
    const effectiveSenderUserId = sessionUserId || senderUserId || undefined;

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

