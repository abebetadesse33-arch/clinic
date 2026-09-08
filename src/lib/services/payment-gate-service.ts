import { db } from "@/db";
import { organizations, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

import { EncounterTabService } from "./encounter-tab-service";

export type PaymentGateType =
  | "registration"
  | "appointment"
  | "telehealth"
  | "bed_admission"
  | "lab_analysis"
  | "medication_dispense"
  | "subscription_renewal"
  | "case_intake";

export type PaymentMode = "hard_gate" | "soft_billing" | "waived" | "subscription_covered" | "encounter_tab_covered";

export type GlobalPaymentPolicy = "strict_enterprise" | "emergency_override" | "balanced_clinical" | "demo_sandbox";

export type BillingModelType = "unified_encounter_tab" | "per_order_gate" | "hybrid";

export interface PaymentGateConfig {
  gateType: PaymentGateType;
  title: string;
  description: string;
  mode: PaymentMode;
  defaultFeeEtb: number;
  allowEmergencyBypass: boolean;
  acceptedMethods: Array<"telebirr" | "bank_transfer" | "chapa_card" | "cash" | "insurance">;
  requiresAdminApprovalForBankTransfer: boolean;
}

export interface EnterprisePaymentSettings {
  globalPolicy: GlobalPaymentPolicy;
  billingModel: BillingModelType;
  defaultDepositAmountEtb: number;
  enablePoCQRPayments: boolean;
  allowPharmacyEmergencyBypass: boolean;
  softGateLabCollection: boolean;
  softGatePharmacyReview: boolean;
  telebirrMerchantId: string;
  telebirrShortCode: string;
  cbeAccountNumber: string;
  cbeAccountName: string;
  awashAccountNumber: string;
  awashAccountName: string;
  gates: Record<PaymentGateType, PaymentGateConfig>;
}

export const DEFAULT_PAYMENT_GATES: Record<PaymentGateType, PaymentGateConfig> = {
  registration: {
    gateType: "registration",
    title: "Patient Self-Registration & Onboarding",
    description: "One-time registration and digital identity issuance fee",
    mode: "waived", // free by default, can be toggled to hard_gate
    defaultFeeEtb: 150,
    allowEmergencyBypass: true,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "cash"],
    requiresAdminApprovalForBankTransfer: false,
  },
  case_intake: {
    gateType: "case_intake",
    title: "Patient Health Case Submission & AI Triage",
    description: "Multidisciplinary specialist case intake and AI triage pipeline",
    mode: "soft_billing",
    defaultFeeEtb: 300,
    allowEmergencyBypass: true,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "insurance"],
    requiresAdminApprovalForBankTransfer: false,
  },
  appointment: {
    gateType: "appointment",
    title: "Outpatient Consultation Scheduling",
    description: "Primary care or specialist clinic appointment booking",
    mode: "soft_billing",
    defaultFeeEtb: 500,
    allowEmergencyBypass: true,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "cash", "insurance"],
    requiresAdminApprovalForBankTransfer: false,
  },
  telehealth: {
    gateType: "telehealth",
    title: "Virtual Telemedicine Room Access",
    description: "Encrypted HD video consultation with attending clinician",
    mode: "hard_gate",
    defaultFeeEtb: 600,
    allowEmergencyBypass: true,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "insurance"],
    requiresAdminApprovalForBankTransfer: false,
  },
  bed_admission: {
    gateType: "bed_admission",
    title: "Inpatient Bed Admission & Initial Deposit",
    description: "Hospital admission security deposit for bed and ward care",
    mode: "hard_gate",
    defaultFeeEtb: 3500,
    allowEmergencyBypass: true,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "cash", "insurance"],
    requiresAdminApprovalForBankTransfer: true,
  },
  lab_analysis: {
    gateType: "lab_analysis",
    title: "Diagnostic Laboratory Analysis & LIS",
    description: "Clinical chemistry, hematology, and molecular test processing",
    mode: "hard_gate",
    defaultFeeEtb: 850,
    allowEmergencyBypass: true,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "cash", "insurance"],
    requiresAdminApprovalForBankTransfer: false,
  },
  medication_dispense: {
    gateType: "medication_dispense",
    title: "Pharmacy Dispensation & Verification",
    description: "Prescription medication inventory release and verification",
    mode: "hard_gate",
    defaultFeeEtb: 450,
    allowEmergencyBypass: true, // Configurable emergency override enabled for STAT medications
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card", "cash", "insurance"],
    requiresAdminApprovalForBankTransfer: false,
  },
  subscription_renewal: {
    gateType: "subscription_renewal",
    title: "Medical Subscription Plan Billing",
    description: "Recurring B2C family shield or B2B corporate health coverage",
    mode: "hard_gate",
    defaultFeeEtb: 1200,
    allowEmergencyBypass: false,
    acceptedMethods: ["telebirr", "bank_transfer", "chapa_card"],
    requiresAdminApprovalForBankTransfer: true,
  },
};

export const DEFAULT_PAYMENT_SETTINGS: EnterprisePaymentSettings = {
  globalPolicy: "balanced_clinical",
  billingModel: "hybrid",
  defaultDepositAmountEtb: 2500,
  enablePoCQRPayments: true,
  allowPharmacyEmergencyBypass: true,
  softGateLabCollection: true,
  softGatePharmacyReview: true,
  telebirrMerchantId: "TB-NINI-99201",
  telebirrShortCode: "88210",
  cbeAccountNumber: "1000293848192",
  cbeAccountName: "NiniMed Enterprise Health Ltd.",
  awashAccountNumber: "01320984819200",
  awashAccountName: "NiniMed Enterprise Health Ltd.",
  gates: DEFAULT_PAYMENT_GATES,
};

// In-memory fallback cache with persistent sync to organization settings
let inMemorySettings: EnterprisePaymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };

export class PaymentGateService {
  /**
   * Retrieves enterprise payment settings for a tenant.
   */
  static async getSettings(tenantId?: string): Promise<EnterprisePaymentSettings> {
    try {
      if (!tenantId) return inMemorySettings;

      const [org] = await db
        .select({ settings: organizations.settings })
        .from(organizations)
        .where(eq(organizations.id, tenantId))
        .limit(1);

      if (org && org.settings && typeof org.settings === "object" && (org.settings as any).paymentConfig) {
        inMemorySettings = {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...(org.settings as any).paymentConfig,
        };
      }
    } catch {
      // Fallback to inMemorySettings
    }
    return inMemorySettings;
  }

  /**
   * Updates global policy or specific payment gate configuration.
   */
  static async updateSettings(
    newSettings: Partial<EnterprisePaymentSettings>,
    tenantId?: string,
    adminId?: string
  ): Promise<EnterprisePaymentSettings> {
    inMemorySettings = {
      ...inMemorySettings,
      ...newSettings,
      gates: {
        ...inMemorySettings.gates,
        ...(newSettings.gates || {}),
      },
    };

    try {
      if (tenantId) {
        const [org] = await db
          .select({ settings: organizations.settings })
          .from(organizations)
          .where(eq(organizations.id, tenantId))
          .limit(1);

        const currentSettings = (org?.settings as Record<string, unknown>) || {};
        await db
          .update(organizations)
          .set({
            settings: {
              ...currentSettings,
              paymentConfig: inMemorySettings,
            },
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, tenantId));
      }

      // Record audit log
      if (adminId) {
        await db.insert(auditLogs).values({
          tenantId: tenantId || "00000000-0000-0000-0000-000000000001",
          userId: adminId,
          userRole: "tenant_admin",
          action: "UPDATE_PAYMENT_GATE_SETTINGS",
          entityType: "payment_configuration",
          entityId: "global",
          summary: `Updated payment settings. Global policy: ${inMemorySettings.globalPolicy}`,
          diff: newSettings,
        }).catch(() => {});
      }
    } catch {
      // Silently persist in memory
    }

    return inMemorySettings;
  }

  /**
   * Evaluates whether a service requires immediate payment before proceeding.
   */
  static async checkGateAccess(params: {
    gateType: PaymentGateType;
    tenantId?: string;
    encounterId?: string;
    isEmergency?: boolean;
    isStat?: boolean;
    hasActiveSubscription?: boolean;
    isPrepaid?: boolean;
  }): Promise<{
    allowed: boolean;
    requiresPayment: boolean;
    amountDueEtb: number;
    mode: PaymentMode;
    gateConfig: PaymentGateConfig;
    bypassReason?: string;
  }> {
    const settings = await this.getSettings(params.tenantId);
    const gate = settings.gates[params.gateType] || DEFAULT_PAYMENT_GATES[params.gateType];

    // 0. Unified Encounter Tab Active Clearance
    if (params.encounterId) {
      const hasTab = await EncounterTabService.hasActiveClearance(params.encounterId, params.gateType);
      if (hasTab) {
        return {
          allowed: true,
          requiresPayment: false,
          amountDueEtb: 0,
          mode: "encounter_tab_covered",
          gateConfig: gate,
          bypassReason: "Covered by active Unified Encounter Tab (All orders reconciled at discharge).",
        };
      }
    }

    // 1. Global Policy Override & Clinical Emergency / STAT Bypass
    const isEmergencyPermitted =
      (params.isEmergency || params.isStat) &&
      (gate.allowEmergencyBypass ||
        (params.gateType === "medication_dispense" && settings.allowPharmacyEmergencyBypass !== false));

    if (settings.globalPolicy === "emergency_override" || isEmergencyPermitted) {
      return {
        allowed: true,
        requiresPayment: false,
        amountDueEtb: 0,
        mode: "waived",
        gateConfig: gate,
        bypassReason: "Emergency clinical protocol override active. Payment postponed to post-care billing.",
      };
    }

    // 2. Global Policy Override: Demo Sandbox Mode
    if (settings.globalPolicy === "demo_sandbox" || params.isPrepaid) {
      return {
        allowed: true,
        requiresPayment: false,
        amountDueEtb: 0,
        mode: "waived",
        gateConfig: gate,
        bypassReason: "Prepaid or sandbox simulation active.",
      };
    }

    // 3. Subscription Benefit Coverage
    if (params.hasActiveSubscription) {
      return {
        allowed: true,
        requiresPayment: false,
        amountDueEtb: 0,
        mode: "subscription_covered",
        gateConfig: gate,
        bypassReason: "Covered 100% under active NiniMed Health Shield Subscription.",
      };
    }

    // 4. Gate Specific Mode
    if (gate.mode === "waived") {
      return {
        allowed: true,
        requiresPayment: false,
        amountDueEtb: 0,
        mode: "waived",
        gateConfig: gate,
      };
    }

    if (gate.mode === "soft_billing") {
      return {
        allowed: true,
        requiresPayment: false,
        amountDueEtb: gate.defaultFeeEtb,
        mode: "soft_billing",
        gateConfig: gate,
        bypassReason: "Post-care consolidated invoicing enabled. Patient will receive bill after service.",
      };
    }

    // 5. Hard Gate: Payment mandatory right now (Can be settled via PoC QR terminal or Cash)
    return {
      allowed: false,
      requiresPayment: true,
      amountDueEtb: gate.defaultFeeEtb,
      mode: "hard_gate",
      gateConfig: gate,
    };
  }
}
