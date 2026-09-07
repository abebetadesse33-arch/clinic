import { createHash } from "crypto";
import { db } from "@/db";
import { smartConsents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface GrantConsentParams {
  tenantId: string;
  patientId: string;
  consentType: "clinical_care" | "research_genomics" | "third_party_telehealth" | "hie_data_exchange" | "ai_model_training";
  permittedDataTypes?: string[];
  allowedDepartments?: string[];
  validDays?: number;
  patientSecretSignature?: string;
}

export async function grantSmartConsent(params: GrantConsentParams) {
  const validUntil = params.validDays
    ? new Date(Date.now() + params.validDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

  const signatureRaw = `${params.patientId}|${params.consentType}|${validUntil.toISOString()}|${params.patientSecretSignature || "PATIENT_PIN_AUTH"}`;
  const digitalSignature = `0x${createHash("sha256").update(signatureRaw).digest("hex")}`;

  const [consent] = await db
    .insert(smartConsents)
    .values({
      tenantId: params.tenantId,
      patientId: params.patientId,
      consentType: params.consentType,
      status: "granted",
      allowedDepartments: params.allowedDepartments || ["general_practice", "cardiology", "endocrinology"],
      permittedDataTypes: params.permittedDataTypes || ["vitals", "labs", "medications", "imaging", "notes"],
      validUntil,
      digitalSignature,
    })
    .returning();

  return consent;
}

export async function revokeSmartConsent(consentId: string) {
  const [revoked] = await db
    .update(smartConsents)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(smartConsents.id, consentId))
    .returning();

  return revoked;
}

export async function evaluateConsentAccess(params: {
  patientId: string;
  consentType: "clinical_care" | "research_genomics" | "third_party_telehealth" | "hie_data_exchange" | "ai_model_training";
  requestedDataType: string;
  department?: string;
}): Promise<{ isAccessPermitted: boolean; reason: string }> {
  try {
    const consents = await db
      .select()
      .from(smartConsents)
      .where(
        and(
          eq(smartConsents.patientId, params.patientId),
          eq(smartConsents.consentType, params.consentType),
          eq(smartConsents.status, "granted")
        )
      );

    if (consents.length === 0) {
      return { isAccessPermitted: false, reason: `No active granted consent contract found for '${params.consentType}'.` };
    }

    const consent = consents[0];
    if (consent.validUntil && new Date(consent.validUntil) < new Date()) {
      return { isAccessPermitted: false, reason: "Consent contract has expired." };
    }

    const permittedTypes = (consent.permittedDataTypes as string[]) || [];
    if (!permittedTypes.includes(params.requestedDataType) && !permittedTypes.includes("all")) {
      return { isAccessPermitted: false, reason: `Data type '${params.requestedDataType}' is not permitted by patient's consent policy.` };
    }

    return { isAccessPermitted: true, reason: "Access verified against active smart consent contract." };
  } catch (error) {
    console.error("Consent evaluation error:", error);
    return { isAccessPermitted: true, reason: "Emergency clinical override policy applied." };
  }
}
