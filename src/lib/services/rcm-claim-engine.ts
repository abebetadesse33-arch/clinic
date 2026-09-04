import { db } from "@/db";
import { billingClaims } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ClaimInput {
  tenantId: string;
  patientId: string;
  encounterId: string;
  payerName: string;
  payerType: "insurance" | "corporate" | "government" | "self_pay";
  totalAmount: number;
  diagnosisCodes: { code: string; description: string; isPrimary: boolean }[];
  procedureCodes: { code: string; description: string; chargeAmount: number }[];
  hasPriorAuthorization?: boolean;
}

export interface ClaimValidationResult {
  isCleanClaim: boolean;
  aiDenialRiskScore: number; // 0.0 to 1.0 (higher = higher probability of payer denial)
  aiDenialRiskFactors: string[];
  suggestedCorrections: string[];
}

export function evaluateClaimDenialRisk(claim: ClaimInput): ClaimValidationResult {
  const riskFactors: string[] = [];
  const corrections: string[] = [];
  let riskScore = 0.05; // 5% baseline denial rate

  // 1. Missing Prior Authorization for specialized procedures
  const highCostProcedures = ["70553", "74177", "93306", "99215"]; // MRI, CT Abdomen, Echo, Level 5
  const hasHighCostProc = claim.procedureCodes.some((p) => highCostProcedures.includes(p.code));

  if (hasHighCostProc && !claim.hasPriorAuthorization && claim.payerType === "insurance") {
    riskScore += 0.55;
    riskFactors.push("High-complexity diagnostic or level 5 procedure billed without documented Prior Authorization.");
    corrections.push("Obtain and attach Prior Authorization number before submitting to payer.");
  }

  // 2. Medical Necessity Mismatch between ICD-10 and CPT
  const hasCardioProc = claim.procedureCodes.some((p) => p.code.startsWith("93")); // ECG/Echo
  const hasCardioDx = claim.diagnosisCodes.some((d) => d.code.startsWith("I") || d.code.startsWith("R00") || d.code.startsWith("R07"));

  if (hasCardioProc && !hasCardioDx) {
    riskScore += 0.35;
    riskFactors.push("Cardiovascular diagnostic procedure (CPT 93xxx) lacks supporting cardiac diagnosis code (ICD-10 Ixx/R07).");
    corrections.push("Verify encounter notes and add primary cardiac symptom code (e.g. Chest pain R07.9 or Palpitations R00.2).");
  }

  // 3. Primary diagnosis check
  if (!claim.diagnosisCodes.some((d) => d.isPrimary)) {
    riskScore += 0.20;
    riskFactors.push("No primary diagnosis code designated.");
    corrections.push("Designate one primary ICD-10 diagnosis code.");
  }

  riskScore = Math.min(0.99, Math.round(riskScore * 100) / 100);
  const isCleanClaim = riskScore < 0.25;

  return {
    isCleanClaim,
    aiDenialRiskScore: riskScore,
    aiDenialRiskFactors: riskFactors,
    suggestedCorrections: corrections,
  };
}

export async function createAndValidateBillingClaim(input: ClaimInput) {
  const validation = evaluateClaimDenialRisk(input);
  const claimNumber = `CLM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

  const [record] = await db
    .insert(billingClaims)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      claimNumber,
      payerName: input.payerName,
      payerType: input.payerType,
      totalAmount: String(input.totalAmount),
      status: validation.isCleanClaim ? "validated" : "draft",
      diagnosisCodes: input.diagnosisCodes,
      procedureCodes: input.procedureCodes,
      aiDenialRiskScore: String(validation.aiDenialRiskScore),
      aiDenialRiskFactors: validation.aiDenialRiskFactors,
      submissionDate: validation.isCleanClaim ? new Date() : null,
    })
    .returning();

  return {
    claim: record,
    validation,
  };
}

export async function getTenantClaims(tenantId: string) {
  return db
    .select()
    .from(billingClaims)
    .where(eq(billingClaims.tenantId, tenantId))
    .orderBy(desc(billingClaims.createdAt))
    .limit(50);
}
