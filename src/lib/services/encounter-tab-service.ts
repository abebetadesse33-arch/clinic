import { db } from "@/db";
import { encounterTabs, encounters, patients, users, auditLogs, systemPaymentSettings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { dispatchNotification } from "@/lib/notifications/notification-service";

export interface ChargeItem {
  id: string;
  serviceCode: string;
  description: string;
  amountEtb: number;
  department: string;
  orderId?: string;
  chargedAt: string;
}

export interface DischargeStatement {
  tabId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  depositAmountEtb: number;
  depositMethod: string;
  depositTxRef?: string;
  totalChargesEtb: number;
  balanceDueEtb: number;
  refundDueEtb: number;
  status: "active" | "settled" | "refunded";
  chargesList: ChargeItem[];
  settledAt?: string;
  settledBy?: string;
  settlementNotes?: string;
  createdAt: string;
  recommendation: "issue_refund" | "collect_balance" | "exact_settlement";
}

export class EncounterTabService {
  /**
   * Opens an Encounter Tab with an initial registration/check-in deposit.
   */
  static async openTab(input: {
    tenantId?: string;
    encounterId: string;
    patientId: string;
    depositAmountEtb: number;
    depositMethod?: string;
    depositTxRef?: string;
    actorId?: string;
  }) {
    const tenantId = input.tenantId || "00000000-0000-0000-0000-000000000001";
    const depositAmount = Math.max(0, Number(input.depositAmountEtb) || 0);
    const depositMethod = input.depositMethod || "cash";
    const depositTxRef =
      input.depositTxRef || `DEP-${depositMethod.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Check if tab already exists for this encounter
    const [existingTab] = await db
      .select()
      .from(encounterTabs)
      .where(eq(encounterTabs.encounterId, input.encounterId))
      .limit(1);

    if (existingTab) {
      if (existingTab.status === "active") {
        // Increment deposit if additional funds provided
        const newDeposit = Number(existingTab.depositAmountEtb) + depositAmount;
        const totalCharges = Number(existingTab.totalChargesEtb);
        const refundDue = Math.max(0, newDeposit - totalCharges);
        const balanceDue = Math.max(0, totalCharges - newDeposit);

        const [updated] = await db
          .update(encounterTabs)
          .set({
            depositAmountEtb: newDeposit.toFixed(2),
            refundDueEtb: refundDue.toFixed(2),
            balanceDueEtb: balanceDue.toFixed(2),
            depositTxRef,
            updatedAt: new Date(),
          })
          .where(eq(encounterTabs.id, existingTab.id))
          .returning();

        return updated;
      }
    }

    const [tab] = await db
      .insert(encounterTabs)
      .values({
        tenantId,
        encounterId: input.encounterId,
        patientId: input.patientId,
        status: "active",
        depositAmountEtb: depositAmount.toFixed(2),
        depositMethod,
        depositTxRef,
        totalChargesEtb: "0.00",
        balanceDueEtb: "0.00",
        refundDueEtb: depositAmount.toFixed(2),
        chargesList: [],
      })
      .returning();

    // Audit log
    try {
      await db.insert(auditLogs).values({
        tenantId,
        userId: input.actorId || null,
        action: "ENCOUNTER_TAB_OPENED",
        entityType: "encounter_tabs",
        entityId: tab.id,
        summary: `Encounter Tab opened for encounter ${input.encounterId} with deposit of ETB ${depositAmount} via ${depositMethod.toUpperCase()} (Ref: ${depositTxRef}).`,
      });
    } catch {}

    // Send notification to patient if linked
    const [patient] = await db.select().from(patients).where(eq(patients.id, input.patientId)).limit(1);
    if (patient?.userId) {
      dispatchNotification({
        category: "billing",
        type: "payment_received",
        title: `💳 Health Tab Opened: ETB ${depositAmount.toLocaleString()} Deposit`,
        body: `Your visit deposit of ETB ${depositAmount.toLocaleString()} was credited. All consultations, laboratory diagnostics, and medications will run seamlessly against your tab. Any unused balance is refunded at checkout.`,
        priority: "normal",
        recipientUserId: patient.userId,
        actionUrl: `/billing/pos`,
        actionText: "View Encounter Tab",
        relatedEntityType: "encounter_tabs",
        relatedEntityId: tab.id,
      }).catch(() => {});
    }

    return tab;
  }

  /**
   * Charges an order (lab, medication, imaging, consultation) to the active Encounter Tab.
   */
  static async chargeTab(input: {
    encounterId: string;
    serviceCode: string;
    description: string;
    amountEtb: number;
    department: string;
    orderId?: string;
  }): Promise<{ success: boolean; coveredByDeposit: boolean; newTotalCharges: number; remainingDeposit: number }> {
    const [tab] = await db
      .select()
      .from(encounterTabs)
      .where(and(eq(encounterTabs.encounterId, input.encounterId), eq(encounterTabs.status, "active")))
      .limit(1);

    if (!tab) {
      return { success: false, coveredByDeposit: false, newTotalCharges: 0, remainingDeposit: 0 };
    }

    const currentCharges = Number(tab.totalChargesEtb) || 0;
    const deposit = Number(tab.depositAmountEtb) || 0;
    const chargeAmount = Number(input.amountEtb) || 0;
    const newTotal = currentCharges + chargeAmount;

    const refundDue = Math.max(0, deposit - newTotal);
    const balanceDue = Math.max(0, newTotal - deposit);

    const existingList = (tab.chargesList as ChargeItem[]) || [];
    const newChargeItem: ChargeItem = {
      id: `chg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      serviceCode: input.serviceCode,
      description: input.description,
      amountEtb: chargeAmount,
      department: input.department,
      orderId: input.orderId,
      chargedAt: new Date().toISOString(),
    };

    await db
      .update(encounterTabs)
      .set({
        totalChargesEtb: newTotal.toFixed(2),
        refundDueEtb: refundDue.toFixed(2),
        balanceDueEtb: balanceDue.toFixed(2),
        chargesList: [...existingList, newChargeItem],
        updatedAt: new Date(),
      })
      .where(eq(encounterTabs.id, tab.id));

    return {
      success: true,
      coveredByDeposit: newTotal <= deposit,
      newTotalCharges: newTotal,
      remainingDeposit: refundDue,
    };
  }

  /**
   * Retrieves full statement and calculated refund / balance due at discharge.
   */
  static async calculateDischargeStatement(encounterId: string): Promise<DischargeStatement | null> {
    const [tab] = await db
      .select()
      .from(encounterTabs)
      .where(eq(encounterTabs.encounterId, encounterId))
      .limit(1);

    if (!tab) return null;

    const [patient] = await db.select().from(patients).where(eq(patients.id, tab.patientId)).limit(1);

    const deposit = Number(tab.depositAmountEtb);
    const totalCharges = Number(tab.totalChargesEtb);
    const refundDue = Math.max(0, deposit - totalCharges);
    const balanceDue = Math.max(0, totalCharges - deposit);

    let recommendation: "issue_refund" | "collect_balance" | "exact_settlement" = "exact_settlement";
    if (refundDue > 0) recommendation = "issue_refund";
    if (balanceDue > 0) recommendation = "collect_balance";

    return {
      tabId: tab.id,
      encounterId: tab.encounterId,
      patientId: tab.patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Patient Member",
      patientMrn: patient?.mrn || "N/A",
      depositAmountEtb: deposit,
      depositMethod: tab.depositMethod,
      depositTxRef: tab.depositTxRef || undefined,
      totalChargesEtb: totalCharges,
      balanceDueEtb: balanceDue,
      refundDueEtb: refundDue,
      status: tab.status as any,
      chargesList: (tab.chargesList as ChargeItem[]) || [],
      settledAt: tab.settledAt ? tab.settledAt.toISOString() : undefined,
      settledBy: tab.settledBy || undefined,
      settlementNotes: tab.settlementNotes || undefined,
      createdAt: tab.createdAt.toISOString(),
      recommendation,
    };
  }

  /**
   * Settles the Encounter Tab at discharge: pays out refund or collects final balance.
   */
  static async settleTab(input: {
    encounterId: string;
    finalPaymentMethod?: string;
    finalTxRef?: string;
    settledBy?: string;
    settlementNotes?: string;
  }) {
    const statement = await this.calculateDischargeStatement(input.encounterId);
    if (!statement) throw new Error("Encounter Tab not found for encounter: " + input.encounterId);

    const isRefund = statement.refundDueEtb > 0;
    const newStatus = isRefund ? "refunded" : "settled";
    const now = new Date();

    const [updatedTab] = await db
      .update(encounterTabs)
      .set({
        status: newStatus,
        settledAt: now,
        settledBy: input.settledBy || null,
        settlementNotes: input.settlementNotes || (isRefund ? `Refund of ETB ${statement.refundDueEtb.toFixed(2)} disbursed.` : `Final balance settled via ${input.finalPaymentMethod || 'cash'}.`),
        updatedAt: now,
      })
      .where(eq(encounterTabs.id, statement.tabId))
      .returning();

    // Audit log
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        userId: input.settledBy || null,
        action: isRefund ? "ENCOUNTER_TAB_REFUNDED" : "ENCOUNTER_TAB_SETTLED",
        entityType: "encounter_tabs",
        entityId: statement.tabId,
        summary: `Encounter Tab for ${statement.patientName} (${statement.patientMrn}) settled. Deposit: ETB ${statement.depositAmountEtb}, Total Charges: ETB ${statement.totalChargesEtb}. ${isRefund ? `Refund disbursed: ETB ${statement.refundDueEtb}` : `Balance collected: ETB ${statement.balanceDueEtb}`}.`,
      });
    } catch {}

    // Dispatch notification to patient
    const [patient] = await db.select().from(patients).where(eq(patients.id, statement.patientId)).limit(1);
    if (patient?.userId) {
      dispatchNotification({
        category: "billing",
        type: "payment_received",
        title: isRefund ? `💵 Tab Settled: ETB ${statement.refundDueEtb.toLocaleString()} Refund Processed` : `🧾 Tab Settled: Discharge Statement Complete`,
        body: isRefund
          ? `Your visit is complete! Out of your ETB ${statement.depositAmountEtb.toLocaleString()} deposit, your total charges were ETB ${statement.totalChargesEtb.toLocaleString()}. An unused balance refund of ETB ${statement.refundDueEtb.toLocaleString()} has been processed via ${statement.depositMethod.toUpperCase()}.`
          : `Your visit is complete! Total charges: ETB ${statement.totalChargesEtb.toLocaleString()}. Discharge balance has been fully settled. Thank you for visiting NiniMed!`,
        priority: "normal",
        recipientUserId: patient.userId,
        actionUrl: `/billing/pos`,
        actionText: "View Final Receipt",
        relatedEntityType: "encounter_tabs",
        relatedEntityId: statement.tabId,
      }).catch(() => {});
    }

    return updatedTab;
  }

  /**
   * Fast check for Central State Machine: determines if an encounter has an active tab granting clearance.
   */
  static async hasActiveClearance(encounterId: string, workflow: string): Promise<boolean> {
    try {
      const [tab] = await db
        .select()
        .from(encounterTabs)
        .where(and(eq(encounterTabs.encounterId, encounterId), eq(encounterTabs.status, "active")))
        .limit(1);

      if (!tab) return false;

      // Active tab exists! In Unified Tab mode, all routine clinical orders are pre-cleared against the tab
      return true;
    } catch {
      return false;
    }
  }
}
