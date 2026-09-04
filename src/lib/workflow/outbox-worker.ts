import { db } from "@/db";
import { orderOutboxEvents } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { dispatchOrderResultNotification } from "@/lib/workflow/care-team-resolver";

export interface QueueOutboxParams {
  tenantId: string;
  orderId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * Enqueues an outbox event atomically within a caller's transaction.
 */
export async function queueOrderOutboxEvent(params: QueueOutboxParams, tx?: any) {
  const database = tx || db;
  const key = params.idempotencyKey || `evt-${params.orderId}-${params.eventType}-${Date.now()}`;

  const [record] = await database
    .insert(orderOutboxEvents)
    .values({
      tenantId: params.tenantId,
      orderId: params.orderId,
      eventType: params.eventType,
      payload: JSON.stringify(params.payload),
      status: "pending",
      idempotencyKey: key,
      retryCount: 0,
    })
    .onConflictDoNothing({ target: orderOutboxEvents.idempotencyKey })
    .returning();

  return record;
}

/**
 * Processes a batch of pending transactional outbox events with exponential retries.
 */
export async function processOutboxBatch(batchSize = 25): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  const pendingEvents = await db
    .select()
    .from(orderOutboxEvents)
    .where(and(eq(orderOutboxEvents.status, "pending"), lte(orderOutboxEvents.retryCount, 3)))
    .limit(batchSize);

  for (const event of pendingEvents) {
    try {
      await db
        .update(orderOutboxEvents)
        .set({ status: "processing" })
        .where(eq(orderOutboxEvents.id, event.id));

      const payload = JSON.parse(event.payload);

      // Dispatch targeted order notification
      if (
        event.eventType === "ORDER_RESULT_AVAILABLE" ||
        event.eventType === "ORDER_CREATED" ||
        event.eventType === "ORDER_STATUS_CHANGED"
      ) {
        await dispatchOrderResultNotification({
          id: event.orderId,
          encounterId: payload.encounterId,
          testName: payload.testName || payload.clinicalIndication || "Clinical Diagnostic",
          patientId: payload.patientId,
          isCritical: payload.isCritical || false,
          priority: payload.priority || "normal",
          status: payload.status,
        });
      }

      await db
        .update(orderOutboxEvents)
        .set({
          status: "completed",
          processedAt: new Date(),
        })
        .where(eq(orderOutboxEvents.id, event.id));

      processed++;
    } catch (err: any) {
      console.error(`[OutboxWorker] Error processing outbox event ${event.id}:`, err);
      const nextRetry = (event.retryCount || 0) + 1;

      await db
        .update(orderOutboxEvents)
        .set({
          status: nextRetry >= 3 ? "failed" : "pending",
          retryCount: nextRetry,
          errorMessage: err?.message || String(err),
        })
        .where(eq(orderOutboxEvents.id, event.id));

      failed++;
    }
  }

  return { processed, failed };
}
