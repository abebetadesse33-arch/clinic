"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Patient,
  VitalsRecord,
  SymptomRecord,
  LabResultRecord,
  GeneticProfileRecord,
  ImagingFindingRecord,
  PsychologicalAssessmentRecord,
  SocialHistoryRecord,
  MedicationRecord,
  PrescriptionRecord,
  LabOrderRecord,
  AISuggestionRecord,
  BiologicalRuleRecord,
  AuditLogRecord,
  MediaAssetRecord,
  NursingAssessmentRecord,
  PhysiotherapyAssessmentRecord,
  NutritionAssessmentRecord,
  RespiratoryAssessmentRecord,
  CarePlanRecord,
  TaskRecord,
  TeamMessageRecord,
  Role,
  User,
} from "../lib/types/clinical";
import { analyzeBiopsychosocialCase } from "../lib/ai/gemini";
import { checkClinicalSafety, DrugSafetyAlert } from "../lib/safety/drug-checker";

// Default System Users for Credentialed Role Switching
export const SYSTEM_ROLE_PROFILES: Record<Role, User> = {
  guest: {
    id: "",
    fullName: "Guest Visitor",
    email: "",
    role: "guest",
  },
  physician: {
    id: "",
    fullName: "Staff Physician",
    email: "physician@Ninimed.org",
    role: "physician",
  },
  nurse_practitioner: {
    id: "",
    fullName: "Nurse Practitioner",
    email: "np@Ninimed.org",
    role: "nurse_practitioner",
  },
  nurse: {
    id: "",
    fullName: "Clinical Nurse",
    email: "nurse@Ninimed.org",
    role: "nurse",
  },
  triage_staff: {
    id: "",
    fullName: "Clinical Triage Specialist",
    email: "triage@Ninimed.org",
    role: "triage_staff",
  },
  pharmacist: {
    id: "",
    fullName: "Clinical Pharmacist",
    email: "pharmacist@Ninimed.org",
    role: "pharmacist",
  },
  physiotherapist: {
    id: "",
    fullName: "Physiotherapist",
    email: "physiotherapy@Ninimed.org",
    role: "physiotherapist",
  },
  occupational_therapist: {
    id: "",
    fullName: "Occupational Therapist",
    email: "ot@Ninimed.org",
    role: "occupational_therapist",
  },
  dietitian: {
    id: "",
    fullName: "Clinical Dietitian",
    email: "dietitian@Ninimed.org",
    role: "dietitian",
  },
  social_worker: {
    id: "",
    fullName: "Medical Social Worker",
    email: "socialwork@Ninimed.org",
    role: "social_worker",
  },
  radiologist: {
    id: "",
    fullName: "Radiologist",
    email: "radiology@Ninimed.org",
    role: "radiologist",
  },
  pathologist: {
    id: "",
    fullName: "Pathologist",
    email: "pathology@Ninimed.org",
    role: "pathologist",
  },
  lab_technician: {
    id: "",
    fullName: "Lab Technician",
    email: "labtech@Ninimed.org",
    role: "lab_technician",
  },
  genetic_counselor: {
    id: "",
    fullName: "Genetic Counselor",
    email: "genetics@Ninimed.org",
    role: "genetic_counselor",
  },
  respiratory_therapist: {
    id: "",
    fullName: "Respiratory Therapist",
    email: "respiratory@Ninimed.org",
    role: "respiratory_therapist",
  },
  psychologist: {
    id: "",
    fullName: "Clinical Psychologist",
    email: "psychologist@Ninimed.org",
    role: "psychologist",
  },
  biologist: {
    id: "",
    fullName: "Molecular Biologist",
    email: "biologist@Ninimed.org",
    role: "biologist",
  },
  care_coordinator: {
    id: "",
    fullName: "Care Coordinator",
    email: "coordinator@Ninimed.org",
    role: "care_coordinator",
  },
  patient: {
    id: "",
    fullName: "Patient Member",
    email: "patient@Ninimed.org",
    role: "patient",
  },
  tenant_admin: {
    id: "",
    fullName: "Hospital Operations Admin",
    email: "admin@Ninimed.org",
    role: "tenant_admin",
  },
  system_admin: {
    id: "5c254614-7cb0-4e72-a7cb-7bbe0a98c42d",
    fullName: "Abebe Tadesse",
    email: "abebetadesse1@gmail.com",
    role: "system_admin",
  },
  auditor: {
    id: "",
    fullName: "Compliance Auditor",
    email: "compliance@Ninimed.org",
    role: "auditor",
  },
};

// Context Interface
interface ClinicContextType {
  currentUser: User;
  authenticatedSessionId: string | null;
  authResolved: boolean;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (user?: User) => void;
  logout: () => void;
  patients: Patient[];
  selectedPatient: Patient | null;
  selectPatient: (id: string) => void;
  vitals: VitalsRecord[];
  symptoms: SymptomRecord[];
  labResults: LabResultRecord[];
  genetics: GeneticProfileRecord[];
  imaging: ImagingFindingRecord[];
  psychological: PsychologicalAssessmentRecord[];
  socialHistory: SocialHistoryRecord[];
  medications: MedicationRecord[];
  prescriptions: PrescriptionRecord[];
  labOrders: LabOrderRecord[];
  mediaAssets: MediaAssetRecord[];
  carePlans: CarePlanRecord[];
  tasks: TaskRecord[];
  teamMessages: TeamMessageRecord[];
  nursingAssessments: NursingAssessmentRecord[];
  physiotherapyAssessments: PhysiotherapyAssessmentRecord[];
  nutritionAssessments: NutritionAssessmentRecord[];
  aiSuggestions: AISuggestionRecord[];
  biologicalRules: BiologicalRuleRecord[];
  auditLogs: AuditLogRecord[];
  isAnalyzing: boolean;
  activeAiSuggestion: AISuggestionRecord | null;

  // Actions
  runAiAnalysis: (patientId: string) => Promise<AISuggestionRecord>;
  updateAISuggestionStatus: (suggestionId: string, status: "pending_review" | "accepted_full" | "accepted_modified" | "rejected") => void;
  addVital: (data: Omit<VitalsRecord, "id" | "recordedAt">) => Promise<void>;
  createTask: (data: Omit<TaskRecord, "id" | "createdAt" | "status">) => Promise<TaskRecord>;
  updateTaskStatus: (taskId: string, status: "pending" | "in_progress" | "completed" | "cancelled") => Promise<void>;
  sendTeamMessage: (patientId: string, content: string, isUrgent?: boolean) => void;
  updateCarePlanInterventionStatus: (patientId: string, interventionId: string, status: "active" | "completed" | "revised") => void;
  addCarePlanIntervention: (patientId: string, intervention: Omit<CarePlanRecord["interventions"][0], "id">) => void;
  uploadMediaAsset: (asset: Omit<MediaAssetRecord, "id" | "createdAt">) => MediaAssetRecord;
  reviewAiSuggestion: (
    suggestionId: string,
    decision: "accepted_full" | "accepted_modified" | "rejected",
    notes: string,
    medicationOverrides?: Partial<PrescriptionRecord>[],
    labOverrides?: Partial<LabOrderRecord>[]
  ) => void;
  createPrescription: (data: Omit<PrescriptionRecord, "id" | "createdAt" | "status">) => Promise<PrescriptionRecord>;
  createLabOrder: (data: Omit<LabOrderRecord, "id" | "orderedAt" | "status">) => Promise<LabOrderRecord>;
  addPatient: (data: Omit<Patient, "id" | "mrn" | "registeredDate">) => Promise<Patient>;
  addLabResult: (data: Omit<LabResultRecord, "id" | "performedAt">) => Promise<void>;
  addBiologicalRule: (data: Omit<BiologicalRuleRecord, "id" | "createdAt" | "curatedBy">) => void;
  addPsychologicalAssessment: (data: Omit<PsychologicalAssessmentRecord, "id" | "assessedAt">) => void;
  checkSafetyForCandidate: (candidateDrug: string, patientId: string) => DrugSafetyAlert[];
  refreshData: () => Promise<void>;
  isLoadingDb: boolean;
}

export const GUEST_USER: User = {
  id: "",
  fullName: "Guest Visitor",
  email: "",
  role: "guest",
};

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<Role>("guest");
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [authenticatedSessionId, setAuthenticatedSessionId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [vitals, setVitals] = useState<VitalsRecord[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [labResults, setLabResults] = useState<LabResultRecord[]>([]);
  const [genetics, setGenetics] = useState<GeneticProfileRecord[]>([]);
  const [imaging, setImaging] = useState<ImagingFindingRecord[]>([]);
  const [psychological, setPsychological] = useState<PsychologicalAssessmentRecord[]>([]);
  const [socialHistory, setSocialHistory] = useState<SocialHistoryRecord[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderRecord[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlanRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessageRecord[]>([]);
  const [nursingAssessments, setNursingAssessments] = useState<NursingAssessmentRecord[]>([]);
  const [physiotherapyAssessments, setPhysiotherapyAssessments] = useState<PhysiotherapyAssessmentRecord[]>([]);
  const [nutritionAssessments, setNutritionAssessments] = useState<NutritionAssessmentRecord[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionRecord[]>([]);
  const [biologicalRules, setBiologicalRules] = useState<BiologicalRuleRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeAiSuggestion, setActiveAiSuggestion] = useState<AISuggestionRecord | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);

  const isAuthenticated = currentRole !== "guest";
  const isGuest = currentRole === "guest";

  const canAccessAdminRole = useCallback((role: Role, user?: User) => {
    if (role === "system_admin") return true;
    if (role !== "tenant_admin") return true;
    return Boolean(user?.isAdminGrantedBySuperAdmin);
  }, []);

  // Strict Role Switching: Preserves the authentic session user ID
  // NEVER defaults to the newest user in the database (users[users.length - 1]).
  const setCurrentRole = useCallback((role: Role) => {
    if (role === "tenant_admin" && !canAccessAdminRole(role, currentUser)) {
      return;
    }

    if (role === "system_admin" && currentUser.role !== "system_admin") {
      return;
    }

    setCurrentRoleState(role);
    setCurrentUser((prev) => {
      const profile = SYSTEM_ROLE_PROFILES[role];
      return {
        ...prev,
        role,
        // Preserve authentic session ID; do NOT generate or borrow random user IDs
        id: prev.id || authenticatedSessionId || (role === "guest" ? "" : prev.id),
        fullName: prev.fullName || profile?.fullName || (role === "guest" ? "Guest Visitor" : "Care Team Member"),
      };
    });
  }, [authenticatedSessionId, canAccessAdminRole, currentUser]);

  // Strict Login: Binds session strictly to the authenticated user's ID
  const login = useCallback((user?: User) => {
    if (user && user.id) {
      const normalizedRole = user.role === "tenant_admin" && !canAccessAdminRole("tenant_admin", user)
        ? "physician"
        : user.role;

      const normalizedUser = {
        ...user,
        role: normalizedRole,
      };

      setAuthenticatedSessionId(user.id);
      setCurrentUser(normalizedUser);
      setCurrentRoleState(normalizedRole);
    }
  }, [canAccessAdminRole]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/v1/auth/signout", { method: "POST" });
    } catch { }
    setAuthenticatedSessionId(null);
    setCurrentRoleState("guest");
    setCurrentUser(GUEST_USER);
  }, []);

  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) ||
    patients[0] ||
    null;

  // Real Database Synchronizer on Mount & Patient Change
  const refreshData = useCallback(async () => {
    try {
      setIsLoadingDb(true);

      const [patRes, rxRes, vitRes, labRes, taskRes, auditRes] = await Promise.all([
        fetch("/api/v1/patients?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/prescriptions?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/vitals?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/lab-results?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/tasks?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/audit-logs?limit=50").then((r) => r.json()).catch(() => null),
      ]);

      if (patRes?.success && Array.isArray(patRes.data)) {
        const mappedPatients: Patient[] = patRes.data.map((p: any) => ({
          id: p.id,
          mrn: p.mrn,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: typeof p.dateOfBirth === "string" ? p.dateOfBirth.substring(0, 10) : "1980-01-01",
          age: p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : 45,
          gender: p.gender || "female",
          bloodType: p.bloodType || "O+",
          phone: p.phone || "",
          email: p.email || "",
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          emergencyContact: p.emergencyContact || "None",
          primaryDoctor: "Care Physician",
          triagePriority: p.triagePriority || "routine",
          avatar: p.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
          registeredDate: p.createdAt ? p.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
        }));
        setPatients(mappedPatients);
        if (!selectedPatientId && mappedPatients.length > 0) {
          const savedId = typeof window !== "undefined" ? localStorage.getItem("Nini_selected_patient_id") : null;
          const initialId = (savedId && mappedPatients.some((p) => p.id === savedId)) ? savedId : mappedPatients[0].id;
          setSelectedPatientId(initialId);
        }
      }

      if (rxRes?.success && Array.isArray(rxRes.data)) {
        setPrescriptions(
          rxRes.data.map((r: any) => ({
            id: r.id,
            patientId: r.patientId,
            doctorId: r.doctorId || "11111111-1111-1111-1111-111111111101",
            doctorName: "Dr. Sarah Mitchell, MD",
            medicationName: r.medicationName,
            dosage: r.dosage,
            frequency: r.frequency,
            route: r.route || "Oral",
            durationDays: r.durationDays || 30,
            dispenseQuantity: r.dispenseQuantity || r.quantity || 30,
            refills: r.refillsAllowed || r.refills || 0,
            indication: r.indication || "",
            prescriberSignature: r.prescriberSignature || "DIGISIG-VERIFIED",
            signedAt: r.signedAt ? r.signedAt.toString() : new Date().toISOString(),
            status: r.status || "signed",
            createdAt: r.createdAt ? r.createdAt.toString() : new Date().toISOString(),
          }))
        );
      }

      if (vitRes?.success && Array.isArray(vitRes.data)) {
        setVitals(
          vitRes.data.map((v: any) => ({
            id: v.id,
            patientId: v.patientId,
            systolicBp: v.systolicBp,
            diastolicBp: v.diastolicBp,
            heartRate: v.heartRate,
            respiratoryRate: v.respiratoryRate,
            temperatureC: parseFloat(v.temperatureC) || 37.0,
            oxygenSaturation: parseFloat(v.oxygenSaturation) || 98.0,
            recordedAt: v.recordedAt ? v.recordedAt.toString() : new Date().toISOString(),
          }))
        );
      }

      if (labRes?.success && Array.isArray(labRes.data)) {
        setLabResults(
          labRes.data.map((l: any) => ({
            id: l.id,
            patientId: l.patientId,
            testName: l.testName,
            category: l.category || "Chemistry",
            value: l.value,
            unit: l.unit,
            referenceRangeLow: l.referenceRangeLow ? parseFloat(l.referenceRangeLow) : undefined,
            referenceRangeHigh: l.referenceRangeHigh ? parseFloat(l.referenceRangeHigh) : undefined,
            isAbnormal: Boolean(l.isAbnormal),
            interpretation: l.interpretation || (l.isAbnormal ? "Abnormal" : "Normal"),
            performedAt: l.performedAt ? l.performedAt.toString() : new Date().toISOString(),
          }))
        );
      }

      if (taskRes?.success && Array.isArray(taskRes.data)) {
        setTasks(
          taskRes.data.map((t: any) => ({
            id: t.id,
            patientId: t.patientId,
            patientName: "Patient Record",
            assignedToRole: t.assignedToRole || t.assignedRole || "nurse",
            assignedRole: t.assignedToRole || t.assignedRole || "nurse",
            assignedByUserName: "Care Team Member",
            title: t.title,
            description: t.description || "",
            priority: t.priority || "routine",
            status: t.status || "pending",
            dueDate: t.dueDate ? t.dueDate.toString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            createdAt: t.createdAt ? t.createdAt.toString() : new Date().toISOString(),
          }))
        );
      }

      if (auditRes?.success && Array.isArray(auditRes.data)) {
        setAuditLogs(auditRes.data);
      }

      // Load patient 360 data if selected
      if (selectedPatientId) {
        const fullPatRes = await fetch(`/api/v1/patients/${selectedPatientId}`).then((r) => r.json()).catch(() => null);
        if (fullPatRes?.success && fullPatRes.data) {
          const d = fullPatRes.data;
          if (Array.isArray(d.medications)) {
            setMedications(
              d.medications.map((m: any) => ({
                id: m.id,
                patientId: m.patientId,
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                route: m.route || "Oral",
                indication: m.indication || "",
                startDate: m.startDate || new Date().toISOString().substring(0, 10),
                isActive: Boolean(m.isActive),
                prescribedBy: "Dr. Sarah Mitchell, MD",
                pharmacistVerified: Boolean(m.pharmacistVerified),
              }))
            );
          }
          if (Array.isArray(d.geneticProfiles)) {
            setGenetics(
              d.geneticProfiles.map((g: any) => ({
                id: g.id,
                patientId: g.patientId,
                gene: g.gene,
                variant: g.variant,
                phenotype: g.phenotype,
                clinicalSignificance: g.clinicalSignificance,
                sourcePanel: g.sourcePanel || "Pharmacogenomics Panel",
                testedAt: g.testedAt ? g.testedAt.toString() : new Date().toISOString(),
              }))
            );
          }
        }
      }
    } catch (e) {
      console.warn("DB Live Sync notice:", e);
    } finally {
      setIsLoadingDb(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    // 1. Fetch current authenticated session from database
    // Strictly binds currentUser to the authenticated server session ID
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.user && data.user.id) {
          setAuthenticatedSessionId(data.user.id);
          setCurrentUser(data.user);
          setCurrentRoleState(data.user.role || "guest");
        } else {
          setAuthenticatedSessionId(null);
          setCurrentUser(GUEST_USER);
        }
        setAuthResolved(true);
      })
      .catch(() => {
        setAuthResolved(true);
      });

    // 2. Synchronize real-time clinical database state
    refreshData();
  }, [refreshData]);

  const selectPatient = (id: string) => {
    setSelectedPatientId(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("Nini_selected_patient_id", id);
      } catch {}
    }
  };

  const addAudit = (action: string, entityType: string, entityId: string, summary: string) => {
    const newLog: AuditLogRecord = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role.toUpperCase(),
      action,
      entityType,
      entityId,
      summary,
      ipAddress: "127.0.0.1",
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    fetch("/api/v1/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        entityType,
        entityId,
        summary,
        userId: currentUser.id,
      }),
    }).catch(() => { });
  };

  const addVital = async (data: Omit<VitalsRecord, "id" | "recordedAt">) => {
    const newVital: VitalsRecord = {
      ...data,
      id: `vit-${Date.now()}`,
      recordedAt: new Date().toISOString(),
    };
    setVitals((prev) => [newVital, ...prev]);
    addAudit("VITALS_RECORDED", "vitals", newVital.id, `Recorded vitals for patient ${newVital.patientId}`);

    try {
      await fetch("/api/v1/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          systolicBp: data.systolicBp,
          diastolicBp: data.diastolicBp,
          heartRate: data.heartRate,
          respiratoryRate: data.respiratoryRate,
          temperatureC: data.temperatureC,
          oxygenSaturation: data.oxygenSaturation,
        }),
      });
    } catch (err) {
      console.error("Error saving vital to DB:", err);
    }
  };

  const updateAISuggestionStatus = (
    suggestionId: string,
    status: "pending_review" | "accepted_full" | "accepted_modified" | "rejected"
  ) => {
    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status } : s))
    );
    addAudit("AI_SUGGESTION_STATUS_UPDATED", "ai_suggestions", suggestionId, `Updated status to ${status}`);
  };

  const createTask = async (data: Omit<TaskRecord, "id" | "createdAt" | "status">): Promise<TaskRecord> => {
    const assignedRole = data.assignedToRole || data.assignedRole || "nurse";
    const newTask: TaskRecord = {
      ...data,
      assignedToRole: assignedRole,
      assignedRole: assignedRole,
      id: `tsk-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    addAudit("TASK_CREATED", "tasks", newTask.id, `Assigned "${newTask.title}" to ${assignedRole}`);

    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          title: data.title,
          description: data.description,
          assignedRole,
          priority: data.priority,
          dueDate: data.dueDate,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        newTask.id = d.data.id;
      }
    } catch { }

    return newTask;
  };

  const updateTaskStatus = async (taskId: string, status: "pending" | "in_progress" | "completed" | "cancelled") => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    addAudit("TASK_STATUS_CHANGED", "tasks", taskId, `Task marked as ${status}`);

    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch { }
  };

  const sendTeamMessage = (patientId: string, content: string, isUrgent?: boolean) => {
    const newMsg: TeamMessageRecord = {
      id: `msg-${Date.now()}`,
      patientId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      content,
      isUrgentConsult: Boolean(isUrgent),
      isUrgent: Boolean(isUrgent),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setTeamMessages((prev) => [...prev, newMsg]);
    addAudit("TEAM_MESSAGE_SENT", "team_messages", newMsg.id, `Message sent by ${currentUser.fullName}`);
  };

  const updateCarePlanInterventionStatus = (patientId: string, interventionId: string, status: "active" | "completed" | "revised") => {
    setCarePlans((prev) =>
      prev.map((cp) => {
        if (cp.patientId !== patientId) return cp;
        return {
          ...cp,
          interventions: cp.interventions.map((item) =>
            item.id === interventionId ? { ...item, status, signedBy: currentUser.fullName } : item
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
    addAudit("CARE_PLAN_INTERVENTION_UPDATED", "care_plans", interventionId, `Updated intervention status to ${status}`);
  };

  const addCarePlanIntervention = (patientId: string, intervention: Omit<CarePlanRecord["interventions"][0], "id">) => {
    const newItem = {
      ...intervention,
      id: `int-${Date.now()}`,
    };
    setCarePlans((prev) =>
      prev.map((cp) => {
        if (cp.patientId !== patientId) return cp;
        return {
          ...cp,
          interventions: [...cp.interventions, newItem],
          updatedAt: new Date().toISOString(),
        };
      })
    );
    addAudit("CARE_PLAN_INTERVENTION_ADDED", "care_plans", newItem.id, `Added intervention for role ${newItem.role}`);
  };

  const uploadMediaAsset = (assetData: Omit<MediaAssetRecord, "id" | "createdAt">): MediaAssetRecord => {
    const newAsset: MediaAssetRecord = {
      ...assetData,
      id: `med-ast-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMediaAssets((prev) => [newAsset, ...prev]);
    addAudit("MULTIMODAL_ASSET_UPLOADED", "media_assets", newAsset.id, `Uploaded ${newAsset.type}: ${newAsset.title}`);
    return newAsset;
  };

  const runAiAnalysis = async (patientId: string): Promise<AISuggestionRecord> => {
    setIsAnalyzing(true);
    const targetPatient = patients.find((p) => p.id === patientId) || patients[0];

    const bundle = {
      patient: targetPatient,
      vitals: vitals.find((v) => v.patientId === patientId),
      symptoms: symptoms.filter((s) => s.patientId === patientId),
      labResults: labResults.filter((l) => l.patientId === patientId),
      genetics: genetics.filter((g) => g.patientId === patientId),
      imaging: imaging.filter((img) => img.patientId === patientId),
      psychological: psychological.filter((p) => p.patientId === patientId),
      socialHistory: socialHistory.filter((s) => s.patientId === patientId),
      activeMedications: medications.filter((m) => m.patientId === patientId),
      mediaAssets: mediaAssets.filter((m) => m.patientId === patientId),
      nursing: nursingAssessments.filter((n) => n.patientId === patientId),
      physiotherapy: physiotherapyAssessments.filter((pt) => pt.patientId === patientId),
      nutrition: nutritionAssessments.filter((nu) => nu.patientId === patientId),
    };

    try {
      const aiResponse = await analyzeBiopsychosocialCase(bundle);
      const newSuggestion: AISuggestionRecord = {
        id: `sug-${Date.now()}`,
        patientId,
        createdAt: new Date().toISOString(),
        modelName: aiResponse.modelVersion || "Gemini-1.5-Pro-Multidisciplinary",
        analysisType: "comprehensive_multidisciplinary",
        status: "pending_review",
        aiResponse,
      };

      setAiSuggestions((prev) => [newSuggestion, ...prev]);
      setActiveAiSuggestion(newSuggestion);

      addAudit(
        "AI_MULTIDISCIPLINARY_ANALYSIS_TRIGGERED",
        "ai_suggestions",
        newSuggestion.id,
        `Generated Gemini 1.5 Pro assessment for ${targetPatient ? targetPatient.firstName + " " + targetPatient.lastName : "Patient"}`
      );

      return newSuggestion;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reviewAiSuggestion = (
    suggestionId: string,
    decision: "accepted_full" | "accepted_modified" | "rejected",
    notes: string
  ) => {
    const target = aiSuggestions.find((s) => s.id === suggestionId);
    if (!target) return;

    setAiSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? {
            ...s,
            status: decision,
            reviewNotes: notes,
            reviewedBy: currentUser.fullName,
            reviewedAt: new Date().toISOString(),
          }
          : s
      )
    );

    addAudit(
      `AI_SUGGESTION_${decision.toUpperCase()}`,
      "ai_suggestions",
      suggestionId,
      `Clinician ${currentUser.fullName} completed review with decision: ${decision}`
    );
  };

  const createPrescription = async (data: Omit<PrescriptionRecord, "id" | "createdAt" | "status">): Promise<PrescriptionRecord> => {
    const newRx: PrescriptionRecord = {
      ...data,
      id: `rx-${Date.now()}`,
      status: "signed",
      prescriberSignature: `DIGISIG-${currentUser.id}-${Date.now()}`,
      signedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setPrescriptions((prev) => [newRx, ...prev]);
    addAudit("MANUAL_PRESCRIPTION_CREATED", "prescriptions", newRx.id, `Prescribed ${newRx.medicationName} ${newRx.dosage}`);

    try {
      const res = await fetch("/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          medicationName: data.medicationName,
          dosage: data.dosage,
          frequency: data.frequency,
          route: data.route,
          durationDays: data.durationDays,
          dispenseQuantity: data.dispenseQuantity,
          refills: data.refills,
          indication: data.indication,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        newRx.id = d.data.id;
      }
    } catch (err) {
      console.error("Error creating prescription in DB:", err);
    }

    return newRx;
  };

  const createLabOrder = async (data: Omit<LabOrderRecord, "id" | "orderedAt" | "status">): Promise<LabOrderRecord> => {
    const newOrder: LabOrderRecord = {
      ...data,
      id: `ord-${Date.now()}`,
      status: "ordered",
      orderedAt: new Date().toISOString(),
    };
    setLabOrders((prev) => [newOrder, ...prev]);
    addAudit("MANUAL_LAB_ORDERED", "lab_orders", newOrder.id, `Ordered diagnostic test: ${newOrder.testName}`);

    try {
      const res = await fetch("/api/v1/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          testName: data.testName,
          category: data.category,
          priority: data.priority,
          clinicalReason: data.clinicalReason,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        newOrder.id = d.data.id;
      }
    } catch (err) {
      console.error("Error saving lab order in DB:", err);
    }

    return newOrder;
  };

  const addPatient = async (data: Omit<Patient, "id" | "mrn" | "registeredDate">): Promise<Patient> => {
    const newPat: Patient = {
      ...data,
      id: `pat-${Date.now()}`,
      mrn: `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
      registeredDate: new Date().toISOString().substring(0, 10),
    };
    setPatients((prev) => [newPat, ...prev]);
    addAudit("NEW_PATIENT_REGISTERED", "patients", newPat.id, `Registered patient ${newPat.firstName} ${newPat.lastName} (MRN: ${newPat.mrn})`);

    try {
      const res = await fetch("/api/v1/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodType: data.bloodType,
          phone: data.phone,
          email: data.email,
          allergies: data.allergies,
          emergencyContact: data.emergencyContact,
          triagePriority: data.triagePriority,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        newPat.id = d.data.id;
        newPat.mrn = d.data.mrn;
        setSelectedPatientId(d.data.id);
      }
    } catch (err) {
      console.error("Error creating patient in DB:", err);
    }

    return newPat;
  };

  const addLabResult = async (data: Omit<LabResultRecord, "id" | "performedAt">) => {
    const newLab: LabResultRecord = {
      ...data,
      id: `lab-${Date.now()}`,
      performedAt: new Date().toISOString(),
    };
    setLabResults((prev) => [newLab, ...prev]);
    addAudit("LAB_RESULT_UPLOADED", "lab_results", newLab.id, `Uploaded ${newLab.testName} (${newLab.value} ${newLab.unit})`);

    try {
      await fetch("/api/v1/lab-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          testName: data.testName,
          category: data.category,
          value: data.value,
          unit: data.unit,
          referenceRangeLow: data.referenceRangeLow,
          referenceRangeHigh: data.referenceRangeHigh,
          isAbnormal: data.isAbnormal,
          interpretation: data.interpretation,
        }),
      });
    } catch (err) {
      console.error("Error saving lab result to DB:", err);
    }
  };

  const addBiologicalRule = (data: Omit<BiologicalRuleRecord, "id" | "createdAt" | "curatedBy">) => {
    const newRule: BiologicalRuleRecord = {
      ...data,
      id: `rule-${Date.now()}`,
      curatedBy: currentUser.fullName,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setBiologicalRules((prev) => [newRule, ...prev]);
    addAudit("BIOLOGICAL_RULE_CREATED", "biological_rules", newRule.id, `Curated rule: ${newRule.ruleTitle}`);
  };

  const addPsychologicalAssessment = (data: Omit<PsychologicalAssessmentRecord, "id" | "assessedAt">) => {
    const newPsych: PsychologicalAssessmentRecord = {
      ...data,
      id: `psy-${Date.now()}`,
      assessedAt: new Date().toISOString().substring(0, 10),
    };
    setPsychological((prev) => [newPsych, ...prev]);
    addAudit("PSYCHOLOGICAL_ASSESSMENT_RECORDED", "psychological_assessments", newPsych.id, `Recorded ${newPsych.testName} score ${newPsych.score}`);
  };

  const checkSafetyForCandidate = (candidateDrug: string, patientId: string): DrugSafetyAlert[] => {
    const pAllergies = patients.find((p) => p.id === patientId)?.allergies || [];
    const pMeds = medications.filter((m) => m.patientId === patientId);
    const pLabs = labResults.filter((l) => l.patientId === patientId);
    const pGen = genetics.filter((g) => g.patientId === patientId);

    return checkClinicalSafety(candidateDrug, pMeds, pAllergies, pLabs, pGen);
  };

  return (
    <ClinicContext.Provider
      value={{
        currentUser,
        authenticatedSessionId,
        authResolved,
        currentRole,
        setCurrentRole,
        isAuthenticated,
        isGuest,
        login,
        logout,
        patients,
        selectedPatient,
        selectPatient,
        vitals,
        symptoms,
        labResults,
        genetics,
        imaging,
        psychological,
        socialHistory,
        medications,
        prescriptions,
        labOrders,
        mediaAssets,
        carePlans,
        tasks,
        teamMessages,
        nursingAssessments,
        physiotherapyAssessments,
        nutritionAssessments,
        aiSuggestions,
        biologicalRules,
        auditLogs,
        isAnalyzing,
        activeAiSuggestion,
        runAiAnalysis,
        updateAISuggestionStatus,
        addVital,
        createTask,
        updateTaskStatus,
        sendTeamMessage,
        updateCarePlanInterventionStatus,
        addCarePlanIntervention,
        uploadMediaAsset,
        reviewAiSuggestion,
        createPrescription,
        createLabOrder,
        addPatient,
        addLabResult,
        addBiologicalRule,
        addPsychologicalAssessment,
        checkSafetyForCandidate,
        refreshData,
        isLoadingDb,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}
