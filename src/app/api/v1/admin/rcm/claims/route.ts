import { NextRequest, NextResponse } from "next/server";
import { createAndValidateBillingClaim, getTenantClaims, ClaimInput } from "@/lib/services/rcm-claim-engine";
import { db } from "@/db";
import { patients, encounters } from "@/db/schema";

export const dynamic = "force-dynamic";

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
    const claims = await getTenantClaims(tenantId);
    return NextResponse.json({ success: true, claims });
  } catch (error) {
    console.error("Get claims error:", error);
    return NextResponse.json({ error: "Failed to fetch billing claims" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let resolvedPatientId = body.patientId;
    if (!resolvedPatientId || !UUID_REGEX.test(resolvedPatientId)) {
      const [firstPat] = await db.select({ id: patients.id }).from(patients).limit(1);
      resolvedPatientId = firstPat?.id || DEFAULT_TENANT_ID;
    }

    let resolvedEncounterId = body.encounterId;
    if (!resolvedEncounterId || !UUID_REGEX.test(resolvedEncounterId)) {
      const [firstEnc] = await db.select({ id: encounters.id }).from(encounters).limit(1);
      resolvedEncounterId = firstEnc?.id || DEFAULT_TENANT_ID;
    }

    const input: ClaimInput = {
      tenantId: ensureUuid(body.tenantId, DEFAULT_TENANT_ID),
      patientId: resolvedPatientId,
      encounterId: resolvedEncounterId,
      payerName: body.payerName || "National Health Insurance / Chapa Health",
      payerType: body.payerType || "insurance",
      totalAmount: Number(body.totalAmount) || 350.0,
      diagnosisCodes: body.diagnosisCodes || [
        { code: "E11.9", description: "Type 2 diabetes mellitus without complications", isPrimary: true },
        { code: "I10", description: "Essential (primary) hypertension", isPrimary: false },
      ],
      procedureCodes: body.procedureCodes || [
        { code: "99214", description: "Office visit established patient, moderate complexity", chargeAmount: 180 },
        { code: "83036", description: "Hemoglobin A1c assay", chargeAmount: 45 },
        { code: "80053", description: "Comprehensive metabolic panel", chargeAmount: 65 },
      ],
      hasPriorAuthorization: body.hasPriorAuthorization ?? true,
    };

    const result = await createAndValidateBillingClaim(input);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Create claim error:", error);
    return NextResponse.json({ error: "Failed to process billing claim" }, { status: 500 });
  }
}
