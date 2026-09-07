import { NextRequest, NextResponse } from "next/server";
import { anchorAuditLogsToBlockchain, verifyAuditLogIntegrity } from "@/lib/security/blockchain-anchor";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUuid(val: any, fallback: string): string {
  if (typeof val === "string" && UUID_REGEX.test(val)) {
    return val;
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTenantId = searchParams.get("tenantId");
  const tenantId = ensureUuid(rawTenantId, DEFAULT_TENANT_ID);

  try {
    const verification = await verifyAuditLogIntegrity(tenantId);
    return NextResponse.json({ success: true, verification });
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return NextResponse.json({ error: "Failed to verify blockchain audit trail" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = ensureUuid(body?.tenantId, DEFAULT_TENANT_ID);

    const anchor = await anchorAuditLogsToBlockchain(tenantId);
    return NextResponse.json({ success: true, anchor });
  } catch (error) {
    console.error("Blockchain anchor error:", error);
    return NextResponse.json({ error: "Failed to anchor audit logs to blockchain" }, { status: 500 });
  }
}
