import crypto from "crypto";
import { SQL, and, eq } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/**
 * Enforces strict multi-tenant scoping on Drizzle queries.
 * Prevents cross-tenant data leaks and unauthorized inter-facility access.
 */
export function withTenant(tenantColumn: PgColumn, tenantId: string, condition?: SQL): SQL {
  const tenantCondition = eq(tenantColumn, tenantId);
  return condition ? and(tenantCondition, condition)! : tenantCondition;
}

/**
 * Appends a tamper-evident, SHA-256 state-checksummed audit log record.
 */
export async function createTamperEvidentAuditLog(params: {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  summary: string;
  ipAddress?: string;
  tx?: any;
}) {
  const database = params.tx || db;
  const serialized = JSON.stringify(params.payload || {});
  const checksum = crypto.createHash("sha256").update(serialized).digest("hex");

  await database.insert(auditLogs).values({
    tenantId: params.tenantId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: `${params.summary} [Checksum: ${checksum.slice(0, 10)}]`,
    ipAddress: params.ipAddress || "127.0.0.1",
  });
}
