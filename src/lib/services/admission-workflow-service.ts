import { db } from "@/db";
import {
  encounters,
  tasks,
  vitals,
  nursingAssessments,
  carePlans,
  prescriptions,
  labOrders,
  nutritionAssessments,
  socialHistory,
  physiotherapyAssessments,
  occupationalTherapyAssessments,
  auditLogs,
  patients,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ClinicalOrderSet } from "./clinical-order-sets";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdmissionStepId =
  | "front_desk"
  | "nurse_assessment"
  | "physician_review"
  | "pharmacy_review"
  | "dietitian_assessment"
  | "social_work_assessment"
  | "therapy_assessment"
  | "discharge_planning"
  | "completed";

export interface DuplicatePatientMatch {
  patientId: string;
  mrn: string;
  fullName: string;
  dateOfBirth: string;
  phone?: string;
  matchScorePercent: number;
}

export interface StartAdmissionInput {
  tenantId: string;
  patientId?: string;
  preRegistrationData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: "male" | "female" | "other";
    phone: string;
    email?: string;
    emergencyContact?: string;
    allergies?: string[];
  };
  encounterType: "in_person" | "emergency" | "telehealth" | "consultation";
  admissionStatus: "admitted" | "observation" | "outpatient" | "emergency";
  chiefComplaint: string;
  assignedNurseId?: string;
  assignedPhysicianId: string;
  assignedCareCoordinatorId?: string;
  frontDeskStaffId: string;
}

export interface NurseAssessmentInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  nurseId: string;
  vitals: {
    systolicBp: number;
    diastolicBp: number;
    heartRate: number;
    respiratoryRate: number;
    temperatureC: number;
    oxygenSaturation: number;
    weightKg?: number;
    heightCm?: number;
  };
  morseFallScore: number;
  fallRiskCategory: "low" | "moderate" | "high";
  bradenPressureScore: number;
  painScore: number; // 0-10
  nursingNotes: string;
  aiSuggestedNursingDiagnoses?: string[];
}

export interface PhysicianWorkupInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  physicianId: string;
  primaryDiagnosis: string;
  clinicalNotes: string;
  orderSet?: ClinicalOrderSet;
  selectedOrderItems?: {
    type: "lab" | "imaging" | "medication" | "nursing" | "diet" | "consult";
    name: string;
    priority: "routine" | "urgent" | "stat";
    dosage?: string;
    frequency?: string;
    route?: string;
    instructions?: string;
  }[];
  homeMedicationsReconciliation?: {
    name: string;
    action: "continue" | "modify" | "discontinue";
    notes?: string;
  }[];
  carePlanGoals?: { title: string; targetDate: string; assignedRole: string }[];
  carePlanInterventions?: { description: string; role: string; frequency: string }[];
}

export interface PharmacistReviewInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  pharmacistId: string;
  reviews: {
    prescriptionId?: string;
    medicationName: string;
    action: "approved" | "modified" | "rejected";
    clinicalReason?: string;
    modifiedDosage?: string;
    modifiedFrequency?: string;
  }[];
  pharmacistNotes?: string;
}

export interface DietitianAssessmentInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  dietitianId: string;
  nutritionalRiskScore: "low" | "moderate" | "high_malnutrition";
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  sodiumLimitMg: number;
  dietType: string;
  mealPlanSummary: string;
}

export interface SocialWorkAssessmentInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  socialWorkerId: string;
  housingStatus: string;
  foodSecurity: string;
  transportationAccess: string;
  supportSystemDescription: string;
  recommendedCommunityResources: string[];
  dischargeBarriersIdentified: string[];
}

export interface TherapyAssessmentInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  therapistId: string;
  therapyType: "physiotherapy" | "occupational_therapy";
  barthelIndexScore?: number; // 0-100
  bergBalanceScore?: number; // 0-56
  mobilityStatus: string;
  rehabGoals: string;
  exerciseRegimenSummary: string;
}

export interface DischargePlanningInput {
  encounterId: string;
  patientId: string;
  tenantId: string;
  careCoordinatorId: string;
  dischargeDestination: "home_self_care" | "home_with_home_health" | "skilled_nursing" | "rehab_facility";
  followUpAppointmentsScheduled: { specialty: string; timeframe: string; doctorName?: string }[];
  medicalEquipmentOrdered: string[];
  medicationDischargeCounselingCompleted: boolean;
  coordinatorNotes: string;
}

// ─── Helper: Audit Logger ────────────────────────────────────────────────────

async function logWorkflowAudit(params: {
  tenantId: string;
  userId: string;
  patientId: string;
  action: string;
  details: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      entityType: "encounter_admission",
      entityId: params.patientId,
      diff: params.details,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// ─── Step 1: Front Desk / Admin Creates Encounter ────────────────────────────

export async function checkDuplicatePatients(params: {
  tenantId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
}): Promise<DuplicatePatientMatch[]> {
  try {
    const existing = await db
      .select()
      .from(patients)
      .where(eq(patients.tenantId, params.tenantId))
      .limit(50);

    const matches: DuplicatePatientMatch[] = [];

    for (const p of existing) {
      let score = 0;
      const fnMatch = p.firstName.toLowerCase() === params.firstName.toLowerCase();
      const lnMatch = p.lastName.toLowerCase() === params.lastName.toLowerCase();
      const phoneMatch = Boolean(params.phone && p.phone && p.phone.replace(/\D/g, "") === params.phone.replace(/\D/g, ""));
      const dobMatch = Boolean(params.dateOfBirth && p.dateOfBirth === params.dateOfBirth);

      if (fnMatch && lnMatch) score += 60;
      if (phoneMatch) score += 30;
      if (dobMatch) score += 20;

      if (score >= 50) {
        matches.push({
          patientId: p.id,
          mrn: p.mrn,
          fullName: `${p.firstName} ${p.lastName}`,
          dateOfBirth: p.dateOfBirth,
          phone: p.phone || undefined,
          matchScorePercent: Math.min(100, score),
        });
      }
    }

    return matches.sort((a, b) => b.matchScorePercent - a.matchScorePercent);
  } catch (e) {
    console.error("Duplicate check error:", e);
    return [];
  }
}

export async function startAdmissionEncounter(input: StartAdmissionInput) {
  let targetPatientId = input.patientId;

  // If pre-registration provided, create patient if not existing
  if (!targetPatientId && input.preRegistrationData) {
    const mrn = `MRN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const [newPatient] = await db
      .insert(patients)
      .values({
        tenantId: input.tenantId,
        mrn,
        firstName: input.preRegistrationData.firstName,
        lastName: input.preRegistrationData.lastName,
        dateOfBirth: input.preRegistrationData.dateOfBirth,
        gender: input.preRegistrationData.gender,
        phone: input.preRegistrationData.phone,
        email: input.preRegistrationData.email || null,
        emergencyContact: input.preRegistrationData.emergencyContact || null,
        allergies: input.preRegistrationData.allergies || [],
        primaryDoctorId: input.assignedPhysicianId,
        triagePriority: input.admissionStatus === "emergency" ? "critical" : "routine",
      })
      .returning();

    targetPatientId = newPatient.id;
  }

  if (!targetPatientId) {
    throw new Error("Patient ID or Pre-registration data is required");
  }

  // Create Encounter
  const [encounter] = await db
    .insert(encounters)
    .values({
      tenantId: input.tenantId,
      patientId: targetPatientId,
      clinicianId: input.assignedPhysicianId,
      encounterType: input.encounterType,
      status: "in_progress",
      admissionStatus: input.admissionStatus,
      currentStep: "nurse_assessment",
      assignedNurseId: input.assignedNurseId || null,
      assignedPhysicianId: input.assignedPhysicianId,
      assignedCareCoordinatorId: input.assignedCareCoordinatorId || null,
      workflowProgress: {
        frontDesk: { status: "completed", completedAt: new Date().toISOString(), staffId: input.frontDeskStaffId },
        nurse: { status: "pending" },
        physician: { status: "pending" },
        pharmacist: { status: "pending" },
        dietitian: { status: "pending" },
        socialWork: { status: "pending" },
        therapy: { status: "pending" },
        careCoordinator: { status: "pending" },
      },
      chiefComplaint: input.chiefComplaint,
      startTime: new Date(),
    })
    .returning();

  // Create Task for Nurse
  const [nurseTask] = await db
    .insert(tasks)
    .values({
      tenantId: input.tenantId,
      patientId: targetPatientId,
      encounterId: encounter.id,
      taskType: "vitals_assessment",
      assignedToRole: "nurse",
      assignedToUserId: input.assignedNurseId || null,
      assignedByUserId: input.frontDeskStaffId,
      title: "Record Initial Vitals & Nursing Assessment",
      description: `New admission created. Patient chief complaint: ${input.chiefComplaint}. Perform baseline vitals, Morse fall score, and pain assessment.`,
      priority: input.admissionStatus === "emergency" ? "stat" : "urgent",
      status: "pending",
      slaMinutes: 45,
    })
    .returning();

  // Audit Log
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.frontDeskStaffId,
    patientId: targetPatientId,
    action: "ENCOUNTER_CREATED",
    details: {
      encounterId: encounter.id,
      admissionStatus: input.admissionStatus,
      chiefComplaint: input.chiefComplaint,
      assignedPhysicianId: input.assignedPhysicianId,
      assignedNurseId: input.assignedNurseId,
      nurseTaskId: nurseTask.id,
    },
  });

  return { encounter, initialTask: nurseTask };
}

// ─── Step 2: Nurse Submits Vitals & Nursing Assessment ───────────────────────

export async function submitNursingVitalsAndAssessment(input: NurseAssessmentInput) {
  // Check critical flags
  const isCriticalSpO2 = input.vitals.oxygenSaturation < 90;
  const isCriticalHR = input.vitals.heartRate > 130 || input.vitals.heartRate < 45;
  const isCriticalBP = input.vitals.systolicBp >= 180 || input.vitals.systolicBp < 85;
  const hasCriticalVitals = isCriticalSpO2 || isCriticalHR || isCriticalBP;

  // Insert Vitals
  const [vitalRecord] = await db
    .insert(vitals)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      systolicBp: input.vitals.systolicBp,
      diastolicBp: input.vitals.diastolicBp,
      heartRate: input.vitals.heartRate,
      respiratoryRate: input.vitals.respiratoryRate,
      temperatureC: String(input.vitals.temperatureC),
      oxygenSaturation: String(input.vitals.oxygenSaturation),
      weightKg: input.vitals.weightKg ? String(input.vitals.weightKg) : null,
      heightCm: input.vitals.heightCm ? String(input.vitals.heightCm) : null,
      bmi: input.vitals.weightKg && input.vitals.heightCm
        ? String(Math.round((input.vitals.weightKg / Math.pow(input.vitals.heightCm / 100, 2)) * 10) / 10)
        : null,
      recordedBy: input.nurseId,
    })
    .returning();

  // Insert Nursing Assessment
  const [assessment] = await db
    .insert(nursingAssessments)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      morseFallScore: input.morseFallScore,
      fallRiskCategory: input.fallRiskCategory,
      bradenPressureScore: input.bradenPressureScore,
      painScore: input.painScore,
      nursingCareNotes: input.nursingNotes,
      assessedBy: input.nurseId,
    })
    .returning();

  // Update encounter currentStep -> physician_review
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.nurse = {
    status: "completed",
    completedAt: new Date().toISOString(),
    nurseId: input.nurseId,
    hasCriticalVitals,
    morseScore: input.morseFallScore,
  };
  progress.physician = { status: "pending" };

  await db
    .update(encounters)
    .set({
      currentStep: "physician_review",
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId));

  // Mark nurse task complete
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(tasks.encounterId, input.encounterId), eq(tasks.taskType, "vitals_assessment")));

  // Create Task for Physician
  const [physicianTask] = await db
    .insert(tasks)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      taskType: "physician_review",
      assignedToRole: "physician",
      assignedToUserId: encounter?.assignedPhysicianId || null,
      assignedByUserId: input.nurseId,
      title: "Physician Admission Workup & Order Sets",
      description: `Nursing vitals and assessment completed. ${hasCriticalVitals ? "🚨 CRITICAL VITALS DETECTED." : "Patient stable."} Please complete physician review, apply order sets, and formulate care plan.`,
      priority: hasCriticalVitals ? "stat" : "urgent",
      status: "pending",
      slaMinutes: hasCriticalVitals ? 15 : 60,
    })
    .returning();

  // Audit Logs
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.nurseId,
    patientId: input.patientId,
    action: "VITALS_RECORDED",
    details: { encounterId: input.encounterId, vitals: input.vitals, hasCriticalVitals },
  });

  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.nurseId,
    patientId: input.patientId,
    action: "NURSING_ASSESSMENT_COMPLETED",
    details: {
      encounterId: input.encounterId,
      morseFallScore: input.morseFallScore,
      bradenScore: input.bradenPressureScore,
      painScore: input.painScore,
    },
  });

  return {
    vitalRecord,
    assessment,
    hasCriticalVitals,
    nextTask: physicianTask,
  };
}

// ─── Step 3: Physician Workup, Order Sets, & Care Plan ───────────────────────

export async function completePhysicianWorkup(input: PhysicianWorkupInput) {
  const createdLabOrders = [];
  const createdPrescriptions = [];

  // 1. Process Order Set Items
  const items = input.selectedOrderItems || input.orderSet?.items || [];
  for (const item of items) {
    if (item.type === "lab") {
      const [lo] = await db
        .insert(labOrders)
        .values({
          tenantId: input.tenantId,
          patientId: input.patientId,
          doctorId: input.physicianId,
          testName: item.name,
          clinicalReason: input.primaryDiagnosis,
          priority: item.priority || "urgent",
          status: "ordered",
        })
        .returning();
      createdLabOrders.push(lo);
    } else if (item.type === "medication") {
      const [rx] = await db
        .insert(prescriptions)
        .values({
          tenantId: input.tenantId,
          patientId: input.patientId,
          doctorId: input.physicianId,
          medicationName: item.name,
          dosage: item.dosage || "1 dose",
          frequency: item.frequency || "Daily",
          durationDays: 7,
          quantity: 7,
          instructions: item.instructions || "Take as directed",
          status: "draft", // Pending Pharmacist Review
        })
        .returning();
      createdPrescriptions.push(rx);
    }
  }

  // 2. Create or Update Unified Care Plan
  const defaultGoals = [
    { id: "g1", title: `Stabilize and resolve acute symptoms of ${input.primaryDiagnosis}`, targetDate: "Day 3", status: "active", assignedRole: "physician" },
    { id: "g2", title: "Maintain hemodynamic stability and safe oxygenation", targetDate: "Day 2", status: "active", assignedRole: "nurse" },
  ];

  const defaultInterventions = [
    { id: "i1", role: "physician", description: `Guideline-directed medical therapy for ${input.primaryDiagnosis}`, frequency: "Daily", status: "active" },
    { id: "i2", role: "nurse", description: "Serial vitals monitoring q4h and strict intake/output charting", frequency: "Q4H", status: "active" },
    { id: "i3", role: "pharmacist", description: "Review multi-vector drug interactions, renal dosing, and pharmacogenomics", frequency: "Once", status: "active" },
  ];

  const [carePlan] = await db
    .insert(carePlans)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      createdBy: input.physicianId,
      status: "active",
      primaryDiagnosis: input.primaryDiagnosis,
      goals: input.carePlanGoals || defaultGoals,
      interventions: input.carePlanInterventions || defaultInterventions,
    })
    .returning();

  // 3. Update Encounter Step -> pharmacy_review
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.physician = {
    status: "completed",
    completedAt: new Date().toISOString(),
    physicianId: input.physicianId,
    primaryDiagnosis: input.primaryDiagnosis,
    ordersCount: items.length,
  };
  progress.pharmacist = { status: "pending" };

  await db
    .update(encounters)
    .set({
      currentStep: "pharmacy_review",
      clinicalNotes: input.clinicalNotes,
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId));

  // Mark physician task complete
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(tasks.encounterId, input.encounterId), eq(tasks.taskType, "physician_review")));

  // 4. Create Task for Pharmacist
  const [pharmacyTask] = await db
    .insert(tasks)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      taskType: "pharmacy_review",
      assignedToRole: "pharmacist",
      assignedByUserId: input.physicianId,
      title: "Verify Admission Medication Orders (DDI / Renal / PGx)",
      description: `Physician ordered ${createdPrescriptions.length} medication(s) for ${input.primaryDiagnosis}. Please perform DDI safety clearance and approve orders.`,
      priority: "urgent",
      status: "pending",
      slaMinutes: 30,
    })
    .returning();

  // 5. Create Allied Health Consult Tasks if indicated
  const alliedTasks = [];
  const lowerDiag = input.primaryDiagnosis.toLowerCase();

  if (lowerDiag.includes("diabet") || lowerDiag.includes("heart failure") || lowerDiag.includes("malnutr")) {
    const [dietTask] = await db
      .insert(tasks)
      .values({
        tenantId: input.tenantId,
        patientId: input.patientId,
        encounterId: input.encounterId,
        taskType: "nutrition_assessment",
        assignedToRole: "dietitian",
        assignedByUserId: input.physicianId,
        title: "Inpatient Nutritional Assessment & Meal Planning",
        description: `Nutritional consult ordered for ${input.primaryDiagnosis}. Provide medical nutrition therapy plan.`,
        priority: "routine",
        status: "pending",
        slaMinutes: 120,
      })
      .returning();
    alliedTasks.push(dietTask);
  }

  // Audit Logs
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.physicianId,
    patientId: input.patientId,
    action: "PHYSICIAN_REVIEW_COMPLETED",
    details: { encounterId: input.encounterId, primaryDiagnosis: input.primaryDiagnosis, notes: input.clinicalNotes },
  });

  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.physicianId,
    patientId: input.patientId,
    action: "ORDERS_PLACED",
    details: { encounterId: input.encounterId, labOrdersCount: createdLabOrders.length, prescriptionsCount: createdPrescriptions.length },
  });

  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.physicianId,
    patientId: input.patientId,
    action: "INITIAL_PLAN_CREATED",
    details: { encounterId: input.encounterId, carePlanId: carePlan.id },
  });

  return {
    carePlan,
    createdLabOrders,
    createdPrescriptions,
    pharmacyTask,
    alliedTasks,
  };
}

// ─── Step 4: Pharmacist Review & Clearance ───────────────────────────────────

export async function processPharmacistReview(input: PharmacistReviewInput) {
  const processed = [];

  for (const item of input.reviews) {
    if (item.prescriptionId) {
      const newStatus = item.action === "approved" ? "signed" : item.action === "modified" ? "draft" : "rejected";
      const [updatedRx] = await db
        .update(prescriptions)
        .set({
          status: newStatus,
          dosage: item.modifiedDosage || undefined,
          frequency: item.modifiedFrequency || undefined,
          instructions: item.clinicalReason ? `[Pharmacist note: ${item.clinicalReason}]` : undefined,
        })
        .where(eq(prescriptions.id, item.prescriptionId))
        .returning();
      processed.push(updatedRx);
    }
  }

  // Update encounter progress
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.pharmacist = {
    status: "completed",
    completedAt: new Date().toISOString(),
    pharmacistId: input.pharmacistId,
    reviewedCount: input.reviews.length,
    approvedCount: input.reviews.filter((r) => r.action === "approved").length,
  };
  progress.dietitian = { status: "pending" };

  await db
    .update(encounters)
    .set({
      currentStep: "dietitian_assessment",
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId));

  // Mark pharmacy task complete
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(tasks.encounterId, input.encounterId), eq(tasks.taskType, "pharmacy_review")));

  // Audit Log
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.pharmacistId,
    patientId: input.patientId,
    action: "MEDICATION_ORDER_REVIEWED",
    details: { encounterId: input.encounterId, reviews: input.reviews, notes: input.pharmacistNotes },
  });

  return { processed, status: "pharmacy_clearance_completed" };
}

// ─── Step 5: Dietitian Nutritional Assessment ────────────────────────────────

export async function submitDietitianAssessment(input: DietitianAssessmentInput) {
  const [nutrition] = await db
    .insert(nutritionAssessments)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      nutritionalRiskScore: input.nutritionalRiskScore,
      dailyCalorieTarget: input.dailyCalorieTarget,
      proteinTargetGrams: input.proteinTargetGrams,
      sodiumLimitMg: input.sodiumLimitMg,
      dietType: input.dietType,
      mealPlanDetails: { summary: input.mealPlanSummary },
      assessedBy: input.dietitianId,
    })
    .returning();

  // Add nutrition goal to Care Plan
  const [carePlan] = await db
    .select()
    .from(carePlans)
    .where(eq(carePlans.patientId, input.patientId))
    .orderBy(desc(carePlans.createdAt))
    .limit(1);

  if (carePlan) {
    const goals = (carePlan.goals as Array<Record<string, unknown>>) || [];
    goals.push({
      id: `diet-g-${Date.now()}`,
      title: `Adhere to ${input.dietType} (${input.dailyCalorieTarget} kcal/day, Na < ${input.sodiumLimitMg}mg)`,
      targetDate: "Ongoing",
      status: "active",
      assignedRole: "dietitian",
    });

    await db
      .update(carePlans)
      .set({ goals })
      .where(eq(carePlans.id, carePlan.id));
  }

  // Update encounter
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.dietitian = {
    status: "completed",
    completedAt: new Date().toISOString(),
    dietitianId: input.dietitianId,
    dietType: input.dietType,
  };
  progress.socialWork = { status: "pending" };

  await db
    .update(encounters)
    .set({
      currentStep: "social_work_assessment",
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId));

  // Mark task complete
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(tasks.encounterId, input.encounterId), eq(tasks.taskType, "nutrition_assessment")));

  // Audit Log
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.dietitianId,
    patientId: input.patientId,
    action: "NUTRITION_ASSESSMENT_COMPLETED",
    details: { encounterId: input.encounterId, dietType: input.dietType, calories: input.dailyCalorieTarget },
  });

  return { nutrition, carePlanUpdated: Boolean(carePlan) };
}

// ─── Step 6: Social Worker SDOH Assessment ───────────────────────────────────

export async function submitSocialWorkAssessment(input: SocialWorkAssessmentInput) {
  const [social] = await db
    .insert(socialHistory)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      category: "SDOH_Comprehensive",
      indicator: `Housing: ${input.housingStatus}, Food: ${input.foodSecurity}, Transport: ${input.transportationAccess}`,
      severityLevel: input.foodSecurity.includes("insecure") || input.housingStatus.includes("unstable") ? "high" : "low",
      description: input.supportSystemDescription,
      recommendedAction: input.dischargeBarriersIdentified.join("; "),
      communityResourcesConnected: input.recommendedCommunityResources,
    })
    .returning();

  // Update encounter progress
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.socialWork = {
    status: "completed",
    completedAt: new Date().toISOString(),
    socialWorkerId: input.socialWorkerId,
    communityResourcesCount: input.recommendedCommunityResources.length,
  };
  progress.therapy = { status: "pending" };

  await db
    .update(encounters)
    .set({
      currentStep: "therapy_assessment",
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId));

  // Mark task complete
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(tasks.encounterId, input.encounterId), eq(tasks.taskType, "social_work_assessment")));

  // Audit Log
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.socialWorkerId,
    patientId: input.patientId,
    action: "SOCIAL_WORK_ASSESSMENT_COMPLETED",
    details: { encounterId: input.encounterId, resources: input.recommendedCommunityResources },
  });

  return { social };
}

// ─── Step 7: Physiotherapy & OT Assessment ───────────────────────────────────

export async function submitTherapyAssessment(input: TherapyAssessmentInput) {
  let assessmentRecord;

  if (input.therapyType === "physiotherapy") {
    const [pt] = await db
      .insert(physiotherapyAssessments)
      .values({
        tenantId: input.tenantId,
        patientId: input.patientId,
        bergBalanceScore: input.bergBalanceScore || 48,
        mobilityStatus: input.mobilityStatus,
        rehabGoals: input.rehabGoals,
        exercisePlan: { summary: input.exerciseRegimenSummary },
        assessedBy: input.therapistId,
      })
      .returning();
    assessmentRecord = pt;
  } else {
    const [ot] = await db
      .insert(occupationalTherapyAssessments)
      .values({
        tenantId: input.tenantId,
        patientId: input.patientId,
        barthelIndexScore: input.barthelIndexScore || 85,
        homeSafetyRisk: "low",
        cognitiveSupportNotes: input.rehabGoals,
        assessedBy: input.therapistId,
      })
      .returning();
    assessmentRecord = ot;
  }

  // Update encounter progress
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.therapy = {
    status: "completed",
    completedAt: new Date().toISOString(),
    therapistId: input.therapistId,
    therapyType: input.therapyType,
    mobilityStatus: input.mobilityStatus,
  };
  progress.careCoordinator = { status: "pending" };

  await db
    .update(encounters)
    .set({
      currentStep: "discharge_planning",
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId));

  // Mark task complete
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(tasks.encounterId, input.encounterId), eq(tasks.taskType, "therapy_assessment")));

  // Audit Log
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.therapistId,
    patientId: input.patientId,
    action: "THERAPY_ASSESSMENT_COMPLETED",
    details: { encounterId: input.encounterId, type: input.therapyType, mobility: input.mobilityStatus },
  });

  return { assessmentRecord };
}

// ─── Step 8: Care Coordinator Tracks Discharge Planning ─────────────────────

export async function updateDischargePlanning(input: DischargePlanningInput) {
  // Update Care Plan
  const [carePlan] = await db
    .select()
    .from(carePlans)
    .where(eq(carePlans.patientId, input.patientId))
    .orderBy(desc(carePlans.createdAt))
    .limit(1);

  if (carePlan) {
    const goals = (carePlan.goals as Array<Record<string, unknown>>) || [];
    goals.push({
      id: `dc-g-${Date.now()}`,
      title: `Safe transition to ${input.dischargeDestination.replace(/_/g, " ")} with scheduled follow-ups`,
      targetDate: "Discharge Day",
      status: "active",
      assignedRole: "care_coordinator",
    });

    await db
      .update(carePlans)
      .set({ goals })
      .where(eq(carePlans.id, carePlan.id));
  }

  // Update encounter -> completed
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, input.encounterId));

  const progress = (encounter?.workflowProgress as Record<string, unknown>) || {};
  progress.careCoordinator = {
    status: "completed",
    completedAt: new Date().toISOString(),
    careCoordinatorId: input.careCoordinatorId,
    dischargeDestination: input.dischargeDestination,
    followUpsScheduledCount: input.followUpAppointmentsScheduled.length,
  };

  const [updatedEncounter] = await db
    .update(encounters)
    .set({
      currentStep: "completed",
      workflowProgress: progress,
    })
    .where(eq(encounters.id, input.encounterId))
    .returning();

  // Audit Log
  await logWorkflowAudit({
    tenantId: input.tenantId,
    userId: input.careCoordinatorId,
    patientId: input.patientId,
    action: "DISCHARGE_PLAN_UPDATED",
    details: {
      encounterId: input.encounterId,
      destination: input.dischargeDestination,
      followUps: input.followUpAppointmentsScheduled,
    },
  });

  return { updatedEncounter };
}

// ─── Timeline & Status Query ─────────────────────────────────────────────────

export async function getEncounterAdmissionTimeline(encounterId: string) {
  const [encounter] = await db
    .select()
    .from(encounters)
    .where(eq(encounters.id, encounterId));

  if (!encounter) return null;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.entityId, encounter.patientId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  const relatedTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.encounterId, encounterId))
    .orderBy(desc(tasks.createdAt));

  const [vital] = await db
    .select()
    .from(vitals)
    .where(eq(vitals.encounterId, encounterId))
    .limit(1);

  const [nursing] = await db
    .select()
    .from(nursingAssessments)
    .where(eq(nursingAssessments.encounterId, encounterId))
    .limit(1);

  const [carePlan] = await db
    .select()
    .from(carePlans)
    .where(eq(carePlans.patientId, encounter.patientId))
    .orderBy(desc(carePlans.createdAt))
    .limit(1);

  return {
    encounter,
    workflowProgress: encounter.workflowProgress,
    currentStep: encounter.currentStep,
    vitals: vital,
    nursingAssessment: nursing,
    carePlan,
    tasks: relatedTasks,
    auditTimeline: logs,
  };
}
