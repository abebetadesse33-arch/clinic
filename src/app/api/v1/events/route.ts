import { NextRequest } from "next/server";
import { notificationBus } from "@/lib/notifications/notification-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || "";

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Initial connection handshake
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: "connected",
            tenantId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      const onConfigChange = (event: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: config_change\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream might be closed
        }
      };

      const onNotification = (notif: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`)
          );
        } catch {
          // Stream might be closed
        }
      };

      notificationBus.on("config_change", onConfigChange);
      notificationBus.on("notification", onNotification);

      // Heartbeat ping every 25 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        notificationBus.off("config_change", onConfigChange);
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
      "X-Accel-Buffering": "no",
    },
  });
}
