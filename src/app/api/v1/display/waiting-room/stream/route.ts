import { NextRequest } from "next/server";
import { waitingRoomEventBus } from "@/lib/services/waiting-room-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const displayId = searchParams.get("displayId");
  const tenantId = searchParams.get("tenantId");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Initial connection handshake
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: "connected",
            displayId: displayId || "default",
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      const onDisplayEvent = (event: any) => {
        try {
          // If displayId or tenantId is targeted, filter accordingly
          if (event.displayId && displayId && event.displayId !== displayId) {
            return;
          }
          if (event.tenantId && tenantId && event.tenantId !== tenantId) {
            return;
          }

          controller.enqueue(
            encoder.encode(`event: display_event\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      waitingRoomEventBus.on("display_event", onDisplayEvent);

      // Periodic heartbeat keepalive to prevent proxies from timing out
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        waitingRoomEventBus.off("display_event", onDisplayEvent);
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
