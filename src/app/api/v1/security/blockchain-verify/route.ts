import { NextRequest, NextResponse } from "next/server";
import { anchorAuditLogsToBlockchain, verifyAuditLogIntegrity } from "@/lib/security/blockchain-anchor";
import { requireRoles, requireAdminUser } from "@/lib/security/auth-session";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, ["auditor"]);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const tenantId = auth.user.organizationId;

  try {
    const verification = await verifyAuditLogIntegrity(tenantId);
    return NextResponse.json({ success: true, verification });
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return NextResponse.json({ error: "Failed to verify blockchain audit trail" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const tenantId = auth.user.organizationId;

    const anchor = await anchorAuditLogsToBlockchain(tenantId);
    return NextResponse.json({ success: true, anchor });
  } catch (error) {
    console.error("Blockchain anchor error:", error);
    return NextResponse.json({ error: "Failed to anchor audit logs to blockchain" }, { status: 500 });
  }
}
