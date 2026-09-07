import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminAuditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { verifyAuditChainIntegrity } from "@/lib/security/e2ee-crypto";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/audit-logs — query admin audit logs and verify cryptographic chain integrity
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const actorRole = searchParams.get("actorRole");
    const actionType = searchParams.get("actionType");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await db
      .select({
        id: adminAuditLogs.id,
        tenantId: adminAuditLogs.tenantId,
        actorUserId: adminAuditLogs.actorUserId,
        actorRole: adminAuditLogs.actorRole,
        actorIpAddress: adminAuditLogs.actorIpAddress,
        actorUserAgent: adminAuditLogs.actorUserAgent,
        actionType: adminAuditLogs.actionType,
        targetResourceType: adminAuditLogs.targetResourceType,
        targetResourceId: adminAuditLogs.targetResourceId,
        details: adminAuditLogs.details,
        previousEntryHash: adminAuditLogs.previousEntryHash,
        entryHash: adminAuditLogs.entryHash,
        isTamperFlagged: adminAuditLogs.isTamperFlagged,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit);

    let filtered = logs;
    if (actorRole) filtered = filtered.filter((l) => l.actorRole === actorRole);
    if (actionType) filtered = filtered.filter((l) => l.actionType === actionType);

    // Verify chronological HMAC hash chain integrity (oldest to newest)
    const chronological = [...filtered].reverse();
    const verificationData = chronological.map((e) => ({
      actorUserId: e.actorUserId,
      actorRole: e.actorRole,
      actionType: e.actionType,
      targetResourceType: e.targetResourceType,
      targetResourceId: e.targetResourceId || undefined,
      details: (e.details as Record<string, any>) || {},
      timestamp: e.createdAt.toISOString(),
      entryHash: e.entryHash,
      previousEntryHash: e.previousEntryHash,
    }));

    const chainIntegrity = verifyAuditChainIntegrity(verificationData);

    return NextResponse.json({
      success: true,
      data: {
        logs: filtered,
        total: filtered.length,
        chainIntegrity: {
          isCryptographicallyIntact: chainIntegrity.isValid,
          verifiedEntriesCount: filtered.length,
          tamperFlaggedCount: filtered.filter((l) => l.isTamperFlagged).length,
          lastVerifiedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error("[ADMIN AUDIT LOGS GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
