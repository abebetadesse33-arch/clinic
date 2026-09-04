import { db } from "@/db";
import {
  sagaTransactions,
  encounterEvents,
  labOrders,
  prescriptions,
  auditLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { CentralStateMachineService } from "./central-state-machine";

export interface SagaStepResult {
  stepName: string;
  status: "success" | "failed" | "compensated";
  timestamp: string;
  details?: Record<string, unknown>;
  compensationAction?: string;
}

export class SagaOrchestrator {
  /**
   * Execute Distributed Lab Order & Payment Saga
   */
  static async executeLabOrderPaymentSaga(input: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    doctorId: string;
    testNames: string[];
    cost: number;
    isCoveredBySubscription?: boolean;
  }) {
    const steps: SagaStepResult[] = [];

    // Initialize Saga Transaction Record
    const [saga] = await db
      .insert(sagaTransactions)
      .values({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        sagaType: "lab_order_payment_saga",
        status: "in_progress",
        steps: [],
      })
      .returning();

    try {
      // Step 1: Create Lab Order in database
      const createdOrders = [];
      for (const test of input.testNames) {
        const [lo] = await db
          .insert(labOrders)
          .values({
            tenantId: input.tenantId,
            patientId: input.patientId,
            doctorId: input.doctorId,
            testName: test,
            clinicalReason: "Saga automated admission lab order",
            priority: "urgent",
            status: "ordered",
          })
          .returning();
        createdOrders.push(lo);
      }

      steps.push({
        stepName: "CREATE_LAB_ORDERS",
        status: "success",
        timestamp: new Date().toISOString(),
        details: { count: createdOrders.length },
        compensationAction: "CANCEL_LAB_ORDERS",
      });

      // Dispatch LAB_ORDER_CREATED event
      await CentralStateMachineService.dispatchEvent({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        eventName: "LAB_ORDER_CREATED",
        actorId: input.doctorId,
        actorRole: "doctor",
        payload: { tests: input.testNames, cost: input.cost },
        correlationId: saga.id,
      });

      // Step 2: Handle Payment Gate
      if (input.isCoveredBySubscription || input.cost === 0) {
        // Benefit covers 100%
        steps.push({
          stepName: "WAIVE_PAYMENT_VIA_SUBSCRIPTION",
          status: "success",
          timestamp: new Date().toISOString(),
          details: { waivedAmount: input.cost },
        });

        // Dispatch Payment Confirmed automatically
        await CentralStateMachineService.dispatchEvent({
          tenantId: input.tenantId,
          encounterId: input.encounterId,
          eventName: "LAB_PAYMENT_CONFIRMED",
          actorRole: "system",
          payload: { reason: "100% Subscription Benefit Coverage", amount: input.cost },
          correlationId: saga.id,
        });
      } else {
        // Payment required
        steps.push({
          stepName: "INITIATE_PAYMENT_GATE",
          status: "success",
          timestamp: new Date().toISOString(),
          details: { amountDue: input.cost },
          compensationAction: "REFUND_PAYMENT",
        });

        await CentralStateMachineService.dispatchEvent({
          tenantId: input.tenantId,
          encounterId: input.encounterId,
          eventName: "LAB_PAYMENT_INITIATED",
          actorRole: "front_desk",
          payload: { amountDue: input.cost },
          correlationId: saga.id,
        });
      }

      // Update Saga Record to completed/in_progress
      await db
        .update(sagaTransactions)
        .set({
          status: input.isCoveredBySubscription ? "completed" : "in_progress",
          steps,
          updatedAt: new Date(),
        })
        .where(eq(sagaTransactions.id, saga.id));

      return { sagaId: saga.id, status: input.isCoveredBySubscription ? "completed" : "waiting_for_payment", steps };
    } catch (error: any) {
      // Saga Failure -> Trigger Compensation Rollback
      await this.compensateSagaTransaction(saga.id, error?.message || "Unknown error during Lab saga");
      throw error;
    }
  }

  /**
   * Execute Distributed Pharmacy Payment & Dispense Saga
   */
  static async executePharmacyPaymentDispenseSaga(input: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    doctorId: string;
    medications: Array<{ name: string; dosage: string; frequency: string; cost: number }>;
    isCoveredBySubscription?: boolean;
  }) {
    const steps: SagaStepResult[] = [];

    const [saga] = await db
      .insert(sagaTransactions)
      .values({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        sagaType: "pharmacy_payment_dispense_saga",
        status: "in_progress",
        steps: [],
      })
      .returning();

    try {
      // Step 1: Create Prescriptions (status: draft)
      const createdRx = [];
      let totalCost = 0;
      for (const med of input.medications) {
        totalCost += med.cost;
        const [rx] = await db
          .insert(prescriptions)
          .values({
            tenantId: input.tenantId,
            patientId: input.patientId,
            doctorId: input.doctorId,
            medicationName: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            instructions: "Take as directed by clinician",
            durationDays: 7,
            quantity: 7,
            status: "draft",
          })
          .returning();
        createdRx.push(rx);
      }

      steps.push({
        stepName: "CREATE_PRESCRIPTIONS",
        status: "success",
        timestamp: new Date().toISOString(),
        details: { count: createdRx.length, totalCost },
        compensationAction: "CANCEL_PRESCRIPTIONS",
      });

      // Dispatch MEDICATION_ORDER_CREATED
      await CentralStateMachineService.dispatchEvent({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        eventName: "MEDICATION_ORDER_CREATED",
        actorId: input.doctorId,
        actorRole: "doctor",
        payload: { medications: input.medications, totalCost },
        correlationId: saga.id,
      });

      // Step 2: Payment Gate
      if (input.isCoveredBySubscription || totalCost === 0) {
        steps.push({
          stepName: "WAIVE_MEDICATION_COPAY",
          status: "success",
          timestamp: new Date().toISOString(),
          details: { waivedCost: totalCost },
        });

        await CentralStateMachineService.dispatchEvent({
          tenantId: input.tenantId,
          encounterId: input.encounterId,
          eventName: "MEDICATION_PAYMENT_CONFIRMED",
          actorRole: "system",
          payload: { reason: "Covered by Subscription Plan", totalCost },
          correlationId: saga.id,
        });
      } else {
        steps.push({
          stepName: "INITIATE_MEDICATION_PAYMENT",
          status: "success",
          timestamp: new Date().toISOString(),
          details: { totalCost },
          compensationAction: "REFUND_PAYMENT",
        });

        await CentralStateMachineService.dispatchEvent({
          tenantId: input.tenantId,
          encounterId: input.encounterId,
          eventName: "MEDICATION_PAYMENT_INITIATED",
          actorRole: "front_desk",
          payload: { totalCost },
          correlationId: saga.id,
        });
      }

      await db
        .update(sagaTransactions)
        .set({
          status: "in_progress",
          steps,
          updatedAt: new Date(),
        })
        .where(eq(sagaTransactions.id, saga.id));

      return { sagaId: saga.id, status: "in_progress", steps };
    } catch (error: any) {
      await this.compensateSagaTransaction(saga.id, error?.message || "Pharmacy saga error");
      throw error;
    }
  }

  /**
   * Execute Compensation Rollback for a Distributed Saga Transaction
   */
  static async compensateSagaTransaction(sagaId: string, reason: string) {
    const [saga] = await db
      .select()
      .from(sagaTransactions)
      .where(eq(sagaTransactions.id, sagaId))
      .limit(1);

    if (!saga) return null;

    const steps = (saga.steps as SagaStepResult[]) || [];

    // Execute compensating actions in reverse order
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (step.compensationAction) {
        // In a real banking/EHR environment, call payment refund API or reverse database records
        steps.push({
          stepName: `COMPENSATE_${step.stepName}`,
          status: "compensated",
          timestamp: new Date().toISOString(),
          details: { originalStep: step.stepName, actionTaken: step.compensationAction, reason },
        });
      }
    }

    // Update Saga status to compensated
    const [updatedSaga] = await db
      .update(sagaTransactions)
      .set({
        status: "compensated",
        errorDetails: reason,
        steps,
        updatedAt: new Date(),
      })
      .where(eq(sagaTransactions.id, sagaId))
      .returning();

    // Log Audit
    await db.insert(auditLogs).values({
      tenantId: saga.tenantId,
      action: "SAGA_TRANSACTION_COMPENSATED",
      entityType: "saga_transaction",
      entityId: saga.id,
      diff: { sagaId, sagaType: saga.sagaType, reason, stepsCompensated: steps.length },
    });

    return updatedSaga;
  }
}
