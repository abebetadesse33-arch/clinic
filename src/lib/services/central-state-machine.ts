import { db } from "@/db";
import {
  encounters,
  encounterStates,
  encounterEvents,
  workflowStateHistory,
  stateSlas,
  stateSlaViolations,
  sagaTransactions,
  patients,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Workflow & State Constants ──────────────────────────────────────────────

export type WorkflowType =
  | "parent"
  | "clinical"
  | "lab"
  | "pharmacy"
  | "payment"
  | "referral"
  | "nutrition"
  | "genetics"
  | "imaging"
  | "psychological"
  | "social_work"
  | "therapy"
  | "respiratory";

export const PARENT_STATES = [
  "CHECKED_IN",
  "WITH_DOCTOR",
  "LAB_PENDING",
  "LAB_IN_PROGRESS",
  "AI_ANALYSIS_PENDING",
  "MEDICATION_PENDING",
  "PHARMACY_IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "CRITICAL_ALERT",
] as const;

export const CLINICAL_SUB_STATES = [
  "CONSULTATION_STARTED",
  "SYMPTOMS_RECORDED",
  "VITALS_RECORDED",
  "PHYSICAL_EXAM_RECORDED",
  "AI_SUGGESTIONS_REVIEWED",
  "DIAGNOSIS_RECORDED",
  "TREATMENT_PLAN_CREATED",
  "PLAN_APPROVED",
] as const;

export const LAB_SUB_STATES = [
  "LAB_ORDERED",
  "LAB_PAYMENT_PENDING",
  "LAB_PAID",
  "SAMPLE_COLLECTION_PREPARED",
  "SAMPLE_COLLECTED",
  "SAMPLE_PROCESSING",
  "LAB_RESULTED",
  "AI_ANALYSIS_COMPLETED",
] as const;

export const PHARMACY_SUB_STATES = [
  "MEDICATION_ORDERED",
  "MEDICATION_PAYMENT_PENDING",
  "MEDICATION_PAID",
  "PHARMACIST_REVIEW_STARTED",
  "PHARMACIST_REVIEW_COMPLETED",
  "DISPENSING",
  "DISPENSED",
  "MEDICATION_ADMINISTERED",
] as const;

// ─── Default SLA Targets (in seconds) ─────────────────────────────────────────

export const DEFAULT_STATE_SLAS: Record<string, { maxDuration: number; role: string; action: "notify_supervisor" | "notify_manager" | "auto_transition" | "flag_critical" }> = {
  // Parent
  CHECKED_IN: { maxDuration: 900, role: "doctor", action: "notify_supervisor" }, // 15m
  WITH_DOCTOR: { maxDuration: 1800, role: "doctor", action: "notify_supervisor" }, // 30m
  LAB_PENDING: { maxDuration: 600, role: "front_desk", action: "notify_supervisor" }, // 10m
  LAB_IN_PROGRESS: { maxDuration: 3600, role: "lab_technician", action: "notify_manager" }, // 60m
  MEDICATION_PENDING: { maxDuration: 600, role: "front_desk", action: "notify_supervisor" }, // 10m
  PHARMACY_IN_PROGRESS: { maxDuration: 900, role: "pharmacist", action: "notify_supervisor" }, // 15m

  // Clinical
  CONSULTATION_STARTED: { maxDuration: 1800, role: "doctor", action: "notify_supervisor" },
  SYMPTOMS_RECORDED: { maxDuration: 600, role: "doctor", action: "notify_supervisor" },
  VITALS_RECORDED: { maxDuration: 300, role: "nurse", action: "notify_supervisor" },
  AI_SUGGESTIONS_REVIEWED: { maxDuration: 900, role: "doctor", action: "notify_supervisor" },
  DIAGNOSIS_RECORDED: { maxDuration: 300, role: "doctor", action: "notify_supervisor" },
  TREATMENT_PLAN_CREATED: { maxDuration: 600, role: "doctor", action: "notify_supervisor" },
  PLAN_APPROVED: { maxDuration: 1800, role: "doctor", action: "notify_manager" },

  // Lab
  LAB_ORDERED: { maxDuration: 300, role: "front_desk", action: "notify_supervisor" },
  LAB_PAYMENT_PENDING: { maxDuration: 600, role: "front_desk", action: "notify_supervisor" },
  SAMPLE_COLLECTION_PREPARED: { maxDuration: 300, role: "lab_technician", action: "notify_supervisor" },
  SAMPLE_COLLECTED: { maxDuration: 600, role: "lab_technician", action: "notify_supervisor" },
  SAMPLE_PROCESSING: { maxDuration: 2400, role: "lab_technician", action: "notify_manager" },
  LAB_RESULTED: { maxDuration: 300, role: "lab_technician", action: "notify_supervisor" },
  AI_ANALYSIS_COMPLETED: { maxDuration: 120, role: "doctor", action: "notify_supervisor" },

  // Pharmacy
  MEDICATION_ORDERED: { maxDuration: 300, role: "front_desk", action: "notify_supervisor" },
  MEDICATION_PAYMENT_PENDING: { maxDuration: 600, role: "front_desk", action: "notify_supervisor" },
  PHARMACIST_REVIEW_STARTED: { maxDuration: 600, role: "pharmacist", action: "notify_supervisor" },
  PHARMACIST_REVIEW_COMPLETED: { maxDuration: 900, role: "pharmacist", action: "notify_manager" },
  DISPENSING: { maxDuration: 600, role: "pharmacist", action: "notify_supervisor" },
  DISPENSED: { maxDuration: 300, role: "pharmacist", action: "notify_supervisor" },
};

// ─── Transition Event Mappings ────────────────────────────────────────────────

export interface EventTransitionDefinition {
  eventName: string;
  workflow: WorkflowType;
  allowedSourceStates: string[];
  targetState: string;
  allowedRoles?: string[];
  requiresPaymentClearance?: boolean;
  triggersParentState?: string;
  description: string;
}

export const EVENT_TRANSITIONS: EventTransitionDefinition[] = [
  // Parent Transitions
  {
    eventName: "PATIENT_CHECKED_IN",
    workflow: "parent",
    allowedSourceStates: ["NONE", "CHECKED_IN"],
    targetState: "CHECKED_IN",
    allowedRoles: ["admin", "receptionist", "front_desk"],
    triggersParentState: "CHECKED_IN",
    description: "Front desk confirms patient arrival and registers queue entry.",
  },
  {
    eventName: "DOCTOR_CALLED_PATIENT",
    workflow: "parent",
    allowedSourceStates: ["CHECKED_IN"],
    targetState: "WITH_DOCTOR",
    allowedRoles: ["doctor", "physician", "nurse"],
    triggersParentState: "WITH_DOCTOR",
    description: "Physician opens chart and calls patient into examination room.",
  },

  // Clinical Sub-States
  {
    eventName: "CONSULTATION_STARTED",
    workflow: "clinical",
    allowedSourceStates: ["NONE", "WITH_DOCTOR"],
    targetState: "CONSULTATION_STARTED",
    allowedRoles: ["doctor", "physician"],
    triggersParentState: "WITH_DOCTOR",
    description: "Physician begins formal clinical consultation encounter.",
  },
  {
    eventName: "SYMPTOMS_RECORDED",
    workflow: "clinical",
    allowedSourceStates: ["CONSULTATION_STARTED", "NONE"],
    targetState: "SYMPTOMS_RECORDED",
    allowedRoles: ["doctor", "physician", "nurse"],
    description: "Chief complaint and structured symptoms recorded with AI differential suggestions.",
  },
  {
    eventName: "VITALS_RECORDED",
    workflow: "clinical",
    allowedSourceStates: ["CONSULTATION_STARTED", "SYMPTOMS_RECORDED", "NONE"],
    targetState: "VITALS_RECORDED",
    allowedRoles: ["nurse", "doctor", "physician"],
    description: "Vital signs recorded and checked against physiological thresholds.",
  },
  {
    eventName: "PHYSICAL_EXAM_RECORDED",
    workflow: "clinical",
    allowedSourceStates: ["VITALS_RECORDED", "SYMPTOMS_RECORDED"],
    targetState: "PHYSICAL_EXAM_RECORDED",
    allowedRoles: ["doctor", "physician"],
    description: "Organ-system physical findings documented.",
  },
  {
    eventName: "AI_SUGGESTIONS_REVIEWED",
    workflow: "clinical",
    allowedSourceStates: ["PHYSICAL_EXAM_RECORDED", "SYMPTOMS_RECORDED", "VITALS_RECORDED"],
    targetState: "AI_SUGGESTIONS_REVIEWED",
    allowedRoles: ["doctor", "physician"],
    description: "Clinician reviewed AI diagnosis and intervention recommendations.",
  },
  {
    eventName: "DIAGNOSIS_RECORDED",
    workflow: "clinical",
    allowedSourceStates: ["AI_SUGGESTIONS_REVIEWED", "PHYSICAL_EXAM_RECORDED", "SYMPTOMS_RECORDED"],
    targetState: "DIAGNOSIS_RECORDED",
    allowedRoles: ["doctor", "physician"],
    description: "ICD-10 / SNOMED diagnosis confirmed by physician.",
  },
  {
    eventName: "TREATMENT_PLAN_CREATED",
    workflow: "clinical",
    allowedSourceStates: ["DIAGNOSIS_RECORDED"],
    targetState: "TREATMENT_PLAN_CREATED",
    allowedRoles: ["doctor", "physician"],
    description: "Initial unified care plan goals and multidisciplinary orders drafted.",
  },
  {
    eventName: "PLAN_APPROVED",
    workflow: "clinical",
    allowedSourceStates: ["TREATMENT_PLAN_CREATED"],
    targetState: "PLAN_APPROVED",
    allowedRoles: ["doctor", "physician"],
    description: "Final care plan electronically signed and orders released.",
  },

  // Lab Workflow Sub-States (with Hard Payment Gate)
  {
    eventName: "LAB_ORDER_CREATED",
    workflow: "lab",
    allowedSourceStates: ["NONE", "PLAN_APPROVED", "DIAGNOSIS_RECORDED", "WITH_DOCTOR"],
    targetState: "LAB_ORDERED",
    allowedRoles: ["doctor", "physician"],
    triggersParentState: "LAB_PENDING",
    description: "Lab order entered by physician; requires payment or subscription waiver.",
  },
  {
    eventName: "LAB_PAYMENT_INITIATED",
    workflow: "lab",
    allowedSourceStates: ["LAB_ORDERED"],
    targetState: "LAB_PAYMENT_PENDING",
    allowedRoles: ["front_desk", "patient", "system"],
    description: "Invoice generated for lab tests; waiting for gateway webhook or front desk receipt.",
  },
  {
    eventName: "LAB_PAYMENT_CONFIRMED",
    workflow: "lab",
    allowedSourceStates: ["LAB_ORDERED", "LAB_PAYMENT_PENDING"],
    targetState: "LAB_PAID",
    allowedRoles: ["system", "front_desk", "finance", "admin"],
    description: "Payment confirmed (or waived via subscription benefit); unlocks sample collection.",
  },
  {
    eventName: "SAMPLE_COLLECTION_PREPARED",
    workflow: "lab",
    allowedSourceStates: ["LAB_PAID"],
    targetState: "SAMPLE_COLLECTION_PREPARED",
    allowedRoles: ["lab_technician", "nurse"],
    requiresPaymentClearance: true,
    description: "Tubes, vacutainers, and barcode labels prepared for collection.",
  },
  {
    eventName: "SAMPLE_COLLECTED",
    workflow: "lab",
    allowedSourceStates: ["LAB_PAID", "SAMPLE_COLLECTION_PREPARED"],
    targetState: "SAMPLE_COLLECTED",
    allowedRoles: ["lab_technician", "nurse"],
    requiresPaymentClearance: true,
    triggersParentState: "LAB_IN_PROGRESS",
    description: "Specimen drawn from patient and barcode scanned.",
  },
  {
    eventName: "SAMPLE_PROCESSING_STARTED",
    workflow: "lab",
    allowedSourceStates: ["SAMPLE_COLLECTED"],
    targetState: "SAMPLE_PROCESSING",
    allowedRoles: ["lab_technician"],
    requiresPaymentClearance: true,
    description: "Specimen loaded into lab analyzer / incubator.",
  },
  {
    eventName: "LAB_RESULT_ENTERED",
    workflow: "lab",
    allowedSourceStates: ["SAMPLE_PROCESSING", "SAMPLE_COLLECTED"],
    targetState: "LAB_RESULTED",
    allowedRoles: ["lab_technician", "pathologist"],
    triggersParentState: "AI_ANALYSIS_PENDING",
    description: "Analytical values verified and released to clinical record.",
  },
  {
    eventName: "AI_LAB_ANALYSIS_COMPLETED",
    workflow: "lab",
    allowedSourceStates: ["LAB_RESULTED"],
    targetState: "AI_ANALYSIS_COMPLETED",
    allowedRoles: ["system", "ai_agent"],
    triggersParentState: "WITH_DOCTOR",
    description: "Multimodal AI completed lab interpretation, delta checks, and drug suggestions.",
  },

  // Pharmacy Workflow Sub-States (with Hard Payment Gate)
  {
    eventName: "MEDICATION_ORDER_CREATED",
    workflow: "pharmacy",
    allowedSourceStates: ["NONE", "PLAN_APPROVED", "DIAGNOSIS_RECORDED", "AI_ANALYSIS_COMPLETED"],
    targetState: "MEDICATION_ORDERED",
    allowedRoles: ["doctor", "physician"],
    triggersParentState: "MEDICATION_PENDING",
    description: "Physician ordered prescription medications; sent to pharmacy queue.",
  },
  {
    eventName: "MEDICATION_PAYMENT_INITIATED",
    workflow: "pharmacy",
    allowedSourceStates: ["MEDICATION_ORDERED"],
    targetState: "MEDICATION_PAYMENT_PENDING",
    allowedRoles: ["front_desk", "patient", "system"],
    description: "Awaiting patient copay or full payment for prescribed medications.",
  },
  {
    eventName: "MEDICATION_PAYMENT_CONFIRMED",
    workflow: "pharmacy",
    allowedSourceStates: ["MEDICATION_ORDERED", "MEDICATION_PAYMENT_PENDING"],
    targetState: "MEDICATION_PAID",
    allowedRoles: ["system", "front_desk", "finance", "admin"],
    description: "Payment confirmed (or covered by corporate/family benefit); unlocks dispensing.",
  },
  {
    eventName: "PHARMACIST_REVIEW_STARTED",
    workflow: "pharmacy",
    allowedSourceStates: ["MEDICATION_PAID", "MEDICATION_ORDERED"],
    targetState: "PHARMACIST_REVIEW_STARTED",
    allowedRoles: ["pharmacist"],
    description: "Clinical pharmacist opens profile for DDI, renal dosing, and allergy screening.",
  },
  {
    eventName: "PHARMACIST_REVIEW_COMPLETED",
    workflow: "pharmacy",
    allowedSourceStates: ["PHARMACIST_REVIEW_STARTED", "MEDICATION_PAID", "MEDICATION_ORDERED"],
    targetState: "PHARMACIST_REVIEW_COMPLETED",
    allowedRoles: ["pharmacist"],
    triggersParentState: "PHARMACY_IN_PROGRESS",
    description: "Pharmacist approved/modified the medication orders with safety clearance.",
  },
  {
    eventName: "DISPENSING_STARTED",
    workflow: "pharmacy",
    allowedSourceStates: ["PHARMACIST_REVIEW_COMPLETED", "MEDICATION_PAID"],
    targetState: "DISPENSING",
    allowedRoles: ["pharmacist", "pharmacy_tech"],
    requiresPaymentClearance: true,
    description: "Medications picked, packaged, and labeled with instructions.",
  },
  {
    eventName: "MEDICATION_DISPENSED",
    workflow: "pharmacy",
    allowedSourceStates: ["DISPENSING", "PHARMACIST_REVIEW_COMPLETED"],
    targetState: "DISPENSED",
    allowedRoles: ["pharmacist", "pharmacy_tech"],
    requiresPaymentClearance: true,
    description: "Medications handed to patient with oral counselling or transferred to floor nurse.",
  },
  {
    eventName: "MEDICATION_ADMINISTERED",
    workflow: "pharmacy",
    allowedSourceStates: ["DISPENSED"],
    targetState: "MEDICATION_ADMINISTERED",
    allowedRoles: ["nurse", "doctor"],
    description: "Inpatient/acute medication dose administered and charted.",
  },

  // Allied Health Workflows
  {
    eventName: "NUTRITION_ASSESSMENT_ORDERED",
    workflow: "nutrition",
    allowedSourceStates: ["NONE", "PLAN_APPROVED"],
    targetState: "NUTRITION_ASSESSMENT_ORDERED",
    allowedRoles: ["doctor", "physician"],
    description: "Dietitian consult requested.",
  },
  {
    eventName: "MEAL_PLAN_APPROVED",
    workflow: "nutrition",
    allowedSourceStates: ["NUTRITION_ASSESSMENT_ORDERED", "MEAL_PLAN_GENERATED"],
    targetState: "MEAL_PLAN_APPROVED",
    allowedRoles: ["dietitian", "nutritionist"],
    description: "Medical nutrition therapy plan finalized.",
  },
  {
    eventName: "IMAGING_ORDERED",
    workflow: "imaging",
    allowedSourceStates: ["NONE", "WITH_DOCTOR", "PLAN_APPROVED"],
    targetState: "IMAGING_ORDERED",
    allowedRoles: ["doctor", "physician"],
    description: "Radiology / Ultrasound order placed.",
  },
  {
    eventName: "IMAGING_REPORT_SIGNED",
    workflow: "imaging",
    allowedSourceStates: ["IMAGING_ORDERED", "IMAGING_PERFORMED", "IMAGING_REPORT_CREATED"],
    targetState: "IMAGING_REPORT_SIGNED",
    allowedRoles: ["radiologist", "doctor"],
    description: "Radiologist finalized imaging interpretation.",
  },
  {
    eventName: "ENCOUNTER_COMPLETED",
    workflow: "parent",
    allowedSourceStates: ["WITH_DOCTOR", "PLAN_APPROVED", "DISPENSED", "AI_ANALYSIS_COMPLETED"],
    targetState: "COMPLETED",
    allowedRoles: ["doctor", "care_coordinator", "admin"],
    triggersParentState: "COMPLETED",
    description: "All required parallel workflows completed; encounter closed.",
  },
  {
    eventName: "ENCOUNTER_CANCELLED",
    workflow: "parent",
    allowedSourceStates: ["CHECKED_IN", "WITH_DOCTOR", "LAB_PENDING", "MEDICATION_PENDING"],
    targetState: "CANCELLED",
    allowedRoles: ["doctor", "admin", "front_desk"],
    triggersParentState: "CANCELLED",
    description: "Encounter cancelled with clinical/administrative reason.",
  },
];

// ─── Dispatcher Input & Output ───────────────────────────────────────────────

export interface DispatchEventInput {
  tenantId: string;
  encounterId: string;
  eventName: string;
  actorId?: string;
  actorRole?: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
}

export interface StateMachineMatrix {
  encounterId: string;
  parentState: string;
  parallelStates: Record<string, { state: string; enteredAt: string; slaSeconds: number; isBreached: boolean }>;
  hardPaymentGates: {
    lab: { isPaid: boolean; isBlocked: boolean };
    pharmacy: { isPaid: boolean; isBlocked: boolean };
    imaging: { isPaid: boolean; isBlocked: boolean };
  };
  activeSagas: Array<{ id: string; sagaType: string; status: string; stepsCount: number }>;
  slaBreachesCount: number;
}

// ─── Event-Driven Central State Machine Service ──────────────────────────────

export class CentralStateMachineService {
  /**
   * Dispatch an immutable state machine event and advance parallel workflows
   */
  static async dispatchEvent(input: DispatchEventInput): Promise<{
    success: boolean;
    transitionApplied: boolean;
    eventName: string;
    workflow: WorkflowType;
    previousState: string;
    newState: string;
    parentState: string;
    message: string;
  }> {
    const transitionDef = EVENT_TRANSITIONS.find((t) => t.eventName === input.eventName);

    if (!transitionDef) {
      throw new Error(`Unknown state machine event: ${input.eventName}`);
    }

    // 1. Get Current Active State for this Workflow
    const [currentStateRecord] = await db
      .select()
      .from(encounterStates)
      .where(
        and(
          eq(encounterStates.encounterId, input.encounterId),
          eq(encounterStates.workflow, transitionDef.workflow),
          eq(encounterStates.isActive, true)
        )
      )
      .limit(1);

    const currentWorkflowState = currentStateRecord?.state || "NONE";

    // 2. Validate Source State
    if (!transitionDef.allowedSourceStates.includes(currentWorkflowState) && !transitionDef.allowedSourceStates.includes("NONE")) {
      // In flexible best-practice engines, if already in target state, consider idempotent
      if (currentWorkflowState === transitionDef.targetState) {
        return {
          success: true,
          transitionApplied: false,
          eventName: input.eventName,
          workflow: transitionDef.workflow,
          previousState: currentWorkflowState,
          newState: currentWorkflowState,
          parentState: "UNCHANGED",
          message: `Idempotent event ignored: workflow ${transitionDef.workflow} already in state ${transitionDef.targetState}`,
        };
      }
    }

    // 3. Enforce Hard Payment Gate
    if (transitionDef.requiresPaymentClearance) {
      const isPaidOrWaived = await this.checkPaymentGateClearance(input.encounterId, transitionDef.workflow);
      if (!isPaidOrWaived) {
        throw new Error(
          `HARD PAYMENT GATE ENFORCED: Workflow '${transitionDef.workflow}' cannot enter state '${transitionDef.targetState}' until payment is confirmed or covered by subscription benefit.`
        );
      }
    }

    // 4. Append Immutable Event Record to Store
    const [loggedEvent] = await db
      .insert(encounterEvents)
      .values({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        eventName: input.eventName,
        payload: input.payload || {},
        actorId: input.actorId || null,
        actorRole: input.actorRole || "system",
        correlationId: input.correlationId || `corr-${Date.now()}`,
      })
      .returning();

    // 5. Close Previous State (if active)
    if (currentStateRecord) {
      const enteredAtMs = new Date(currentStateRecord.enteredAt).getTime();
      const exitedAtMs = Date.now();
      const durationSeconds = Math.round((exitedAtMs - enteredAtMs) / 1000);

      await db
        .update(encounterStates)
        .set({ isActive: false, exitedAt: new Date() })
        .where(eq(encounterStates.id, currentStateRecord.id));

      await db.insert(workflowStateHistory).values({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        workflow: transitionDef.workflow,
        state: currentWorkflowState,
        enteredAt: currentStateRecord.enteredAt,
        exitedAt: new Date(),
        durationSeconds,
        enteredBy: input.actorId || null,
        exitReason: `Transitioned to ${transitionDef.targetState} via event ${input.eventName}`,
        metadata: input.payload || {},
      });

      // Check SLA breach
      const slaConfig = DEFAULT_STATE_SLAS[currentWorkflowState];
      if (slaConfig && durationSeconds > slaConfig.maxDuration) {
        await db.insert(stateSlaViolations).values({
          tenantId: input.tenantId,
          encounterId: input.encounterId,
          workflow: transitionDef.workflow,
          state: currentWorkflowState,
          maxDurationSeconds: slaConfig.maxDuration,
          actualDurationSeconds: durationSeconds,
          escalatedTo: input.actorId || null,
        });
      }
    }

    // 6. Open New Active State for the Workflow
    await db.insert(encounterStates).values({
      tenantId: input.tenantId,
      encounterId: input.encounterId,
      workflow: transitionDef.workflow,
      state: transitionDef.targetState,
      isActive: true,
      enteredAt: new Date(),
      metadata: input.payload || {},
    });

    // 7. Coordinate Parent Encounter State (if triggered)
    let parentStateName = "UNCHANGED";
    if (transitionDef.triggersParentState) {
      parentStateName = transitionDef.triggersParentState;

      // Update parent status in encounters table
      await db
        .update(encounters)
        .set({
          status: parentStateName === "COMPLETED" ? "finished" : parentStateName === "CANCELLED" ? "cancelled" : "in_progress",
        })
        .where(eq(encounters.id, input.encounterId));

      // Also track parent workflow state
      const [existingParentState] = await db
        .select()
        .from(encounterStates)
        .where(and(eq(encounterStates.encounterId, input.encounterId), eq(encounterStates.workflow, "parent"), eq(encounterStates.isActive, true)))
        .limit(1);

      if (existingParentState) {
        await db
          .update(encounterStates)
          .set({ isActive: false, exitedAt: new Date() })
          .where(eq(encounterStates.id, existingParentState.id));
      }

      await db.insert(encounterStates).values({
        tenantId: input.tenantId,
        encounterId: input.encounterId,
        workflow: "parent",
        state: parentStateName,
        isActive: true,
        enteredAt: new Date(),
      });
    }

    // 8. Evaluate Dynamic Clinical Rules (Branching)
    await this.evaluateDynamicClinicalRules(input);

    return {
      success: true,
      transitionApplied: true,
      eventName: input.eventName,
      workflow: transitionDef.workflow,
      previousState: currentWorkflowState,
      newState: transitionDef.targetState,
      parentState: parentStateName,
      message: `State machine transitioned ${transitionDef.workflow} to ${transitionDef.targetState}`,
    };
  }

  /**
   * Check whether hard payment gate is cleared (either paid or covered by benefits)
   */
  static async checkPaymentGateClearance(encounterId: string, workflow: WorkflowType): Promise<boolean> {
    const paidState = await db
      .select()
      .from(encounterEvents)
      .where(
        and(
          eq(encounterEvents.encounterId, encounterId),
          eq(
            encounterEvents.eventName,
            workflow === "lab" ? "LAB_PAYMENT_CONFIRMED" : workflow === "pharmacy" ? "MEDICATION_PAYMENT_CONFIRMED" : "IMAGING_PAYMENT_CONFIRMED"
          )
        )
      )
      .limit(1);

    if (paidState.length > 0) return true;

    // Check if covered by subscription/entitlement (simulation waiver)
    const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    if (encounter?.admissionStatus === "emergency") return true; // Emergency waiver

    return false;
  }

  /**
   * Evaluate dynamic clinical rules for branching
   */
  static async evaluateDynamicClinicalRules(input: DispatchEventInput) {
    if (input.eventName === "VITALS_RECORDED" && input.payload) {
      const spo2 = Number(input.payload.oxygenSaturation);
      const hr = Number(input.payload.heartRate);
      const sbp = Number(input.payload.systolicBp);

      if (spo2 < 90 || hr > 130 || sbp >= 180) {
        // Trigger Critical Alert
        await db.insert(encounterEvents).values({
          tenantId: input.tenantId,
          encounterId: input.encounterId,
          eventName: "CRITICAL_ALERT_TRIGGERED",
          payload: { reason: "Critical vital sign detected", spo2, hr, sbp },
          actorRole: "system",
        });
      }
    }
  }

  /**
   * Get full state machine matrix with parallel active states, SLA timers, and hard gate statuses
   */
  static async getEncounterStateMatrix(encounterId: string): Promise<StateMachineMatrix> {
    const activeStates = await db
      .select()
      .from(encounterStates)
      .where(and(eq(encounterStates.encounterId, encounterId), eq(encounterStates.isActive, true)));

    const parallelStates: Record<string, { state: string; enteredAt: string; slaSeconds: number; isBreached: boolean }> = {};

    let parentState = "CHECKED_IN";

    for (const s of activeStates) {
      if (s.workflow === "parent") {
        parentState = s.state;
      }
      const slaConfig = DEFAULT_STATE_SLAS[s.state];
      const maxSeconds = slaConfig ? slaConfig.maxDuration : 3600;
      const elapsedSeconds = Math.round((Date.now() - new Date(s.enteredAt).getTime()) / 1000);

      parallelStates[s.workflow] = {
        state: s.state,
        enteredAt: s.enteredAt.toISOString(),
        slaSeconds: maxSeconds,
        isBreached: elapsedSeconds > maxSeconds,
      };
    }

    // Check payment gates
    const isLabPaid = await this.checkPaymentGateClearance(encounterId, "lab");
    const isPharmacyPaid = await this.checkPaymentGateClearance(encounterId, "pharmacy");
    const isImagingPaid = await this.checkPaymentGateClearance(encounterId, "imaging");

    // Check active sagas
    const sagas = await db
      .select()
      .from(sagaTransactions)
      .where(eq(sagaTransactions.encounterId, encounterId))
      .orderBy(desc(sagaTransactions.createdAt));

    const sagaSummaries = sagas.map((s) => ({
      id: s.id,
      sagaType: s.sagaType,
      status: s.status,
      stepsCount: Array.isArray(s.steps) ? s.steps.length : 0,
    }));

    const breachesCount = Object.values(parallelStates).filter((p) => p.isBreached).length;

    return {
      encounterId,
      parentState,
      parallelStates,
      hardPaymentGates: {
        lab: { isPaid: isLabPaid, isBlocked: !isLabPaid },
        pharmacy: { isPaid: isPharmacyPaid, isBlocked: !isPharmacyPaid },
        imaging: { isPaid: isImagingPaid, isBlocked: !isImagingPaid },
      },
      activeSagas: sagaSummaries,
      slaBreachesCount: breachesCount,
    };
  }

  /**
   * Get append-only chronological event stream
   */
  static async getEncounterEventStream(encounterId: string) {
    return await db
      .select()
      .from(encounterEvents)
      .where(eq(encounterEvents.encounterId, encounterId))
      .orderBy(encounterEvents.occurredAt);
  }

  /**
   * Replay encounter event history to reconstruct state at a given event index
   */
  static async replayEncounterEvents(encounterId: string, upToEventId?: number) {
    const events = await db
      .select()
      .from(encounterEvents)
      .where(eq(encounterEvents.encounterId, encounterId))
      .orderBy(encounterEvents.occurredAt);

    const replayedStates: Record<string, string> = { parent: "CHECKED_IN" };

    for (const evt of events) {
      if (upToEventId && Number(evt.id) > upToEventId) break;

      const trans = EVENT_TRANSITIONS.find((t) => t.eventName === evt.eventName);
      if (trans) {
        replayedStates[trans.workflow] = trans.targetState;
        if (trans.triggersParentState) {
          replayedStates.parent = trans.triggersParentState;
        }
      }
    }

    return {
      encounterId,
      replayedUpToEventId: upToEventId || events[events.length - 1]?.id,
      totalEvents: events.length,
      reconstructedStates: replayedStates,
    };
  }
}
