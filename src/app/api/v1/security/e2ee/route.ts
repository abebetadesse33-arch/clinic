import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminAuditLogs, organizations } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  encryptSensitiveField,
  decryptSensitiveField,
  generateAuditEntryHash,
  EncryptedPayload,
} from "@/lib/security/e2ee-crypto";

export const dynamic = "force-dynamic";

// POST /api/v1/security/e2ee — authenticated field encryption / decryption with audit trail
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      operation, // 'encrypt' | 'decrypt'
      plaintext,
      encryptedPayload,
      actorUserId,
      actorRole,
      tenantId,
      targetResourceType,
      targetResourceId,
      reason,
    } = body;

    if (!operation || !["encrypt", "decrypt"].includes(operation)) {
      return NextResponse.json({ success: false, error: "Invalid operation. Must be 'encrypt' or 'decrypt'." }, { status: 400 });
    }

    if (!actorUserId || !actorRole) {
      return NextResponse.json({ success: false, error: "actorUserId and actorRole are required for E2EE operations." }, { status: 400 });
    }

    // RBAC Authorization Gate for Decryption: Only High-Access Roles Allowed
    const PRIVILEGED_ROLES = ["system_admin", "tenant_admin", "physician", "auditor"];
    if (operation === "decrypt" && !PRIVILEGED_ROLES.includes(actorRole)) {
      return NextResponse.json({
        success: false,
        error: `Role '${actorRole}' is not authorized to decrypt field-level E2EE protected data.`,
      }, { status: 403 });
    }

    // Resolve tenant ID fallback
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      resolvedTenantId = firstOrg?.id;
    }

    if (operation === "encrypt") {
      if (!plaintext) {
        return NextResponse.json({ success: false, error: "plaintext is required for encryption." }, { status: 400 });
      }

      const encrypted = encryptSensitiveField(plaintext);

      return NextResponse.json({
        success: true,
        data: {
          payload: encrypted,
        },
      });
    }

    if (operation === "decrypt") {
      if (!encryptedPayload || !encryptedPayload.ciphertext || !encryptedPayload.iv || !encryptedPayload.authTag) {
        return NextResponse.json({ success: false, error: "Valid encryptedPayload is required for decryption." }, { status: 400 });
      }

      const decResult = decryptSensitiveField(encryptedPayload as EncryptedPayload);
      if (!decResult.success) {
        return NextResponse.json({ success: false, error: decResult.error }, { status: 400 });
      }

      // Record Tamper-Evident Audit Log Entry with Cryptographic Hash Chaining
      if (resolvedTenantId) {
        const [lastEntry] = await db
          .select({ entryHash: adminAuditLogs.entryHash })
          .from(adminAuditLogs)
          .orderBy(desc(adminAuditLogs.createdAt))
          .limit(1);

        const timestamp = new Date().toISOString();
        const auditData = {
          actorUserId,
          actorRole,
          actionType: "decrypt_sensitive_field",
          targetResourceType: targetResourceType || "patient_record",
          targetResourceId: targetResourceId || undefined,
          details: { reason: reason || "Clinical chart review", keyVersion: encryptedPayload.keyVersion },
          timestamp,
        };

        const entryHash = generateAuditEntryHash(auditData, lastEntry?.entryHash);

        await db.insert(adminAuditLogs).values({
          tenantId: resolvedTenantId,
          actorUserId,
          actorRole,
          actorIpAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          actorUserAgent: req.headers.get("user-agent") || "NiniMed-E2EE-Client",
          actionType: "decrypt_sensitive_field",
          targetResourceType: targetResourceType || "patient_record",
          targetResourceId: targetResourceId || null,
          details: auditData.details,
          previousEntryHash: lastEntry?.entryHash || null,
          entryHash,
          isTamperFlagged: false,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          plaintext: decResult.plaintext,
          decryptedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    console.error("[E2EE POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
