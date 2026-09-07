import { NextRequest } from "next/server";
import { notificationBus } from "@/lib/notifications/notification-service";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const userId = auth.user.id;
  const role = auth.user.role;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Initial connection greeting
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      const onNotification = (notif: any) => {
        try {
          // Privilege & Scoping filter
          const isSystemAdmin = role === "system_admin" || role === "tenant_admin";
          const isDirectRecipient = Boolean(userId && notif.recipientUserId === userId);
          const isRoleTarget = Boolean(role && notif.targetRole === role);
          const isBroadcast = !notif.recipientUserId && !notif.targetRole;

          if (isSystemAdmin || isDirectRecipient || isRoleTarget || isBroadcast) {
            controller.enqueue(
              encoder.encode(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`)
            );
          }
        } catch {
          // Stream closed or error
        }
      };

      notificationBus.on("notification", onNotification);

      // Periodic heartbeat keepalive to prevent proxies from timing out
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 20000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        notificationBus.off("notification", onNotification);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
