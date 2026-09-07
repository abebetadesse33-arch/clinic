import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LabResultItem {
  id: string;
  testName: string;
  category?: string;
  value: string;
  unit: string;
  referenceRange: string;
  referenceRangeLow?: string | number;
  referenceRangeHigh?: string | number;
  isAbnormal: boolean;
  performedAt: string;
  plainLanguageExplanation: string;
  orderedBy?: string;
  items?: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "abnormal" | "critical";
  }>;
}

export interface MedicationItem {
  id: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  refillsRemaining: number;
  prescribedBy: string;
  status: string;
  canRefill: boolean;
}

export interface PatientRecordsData {
  patientId: string | null;
  patientName?: string;
  mrn?: string;
  labResults: LabResultItem[];
  medications: MedicationItem[];
  documents?: any[];
}

export interface DocumentItem {
  id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: string;
  uploaderName?: string;
  uploaderRole?: string;
  verificationStatus?: string;
  createdAt: string;
}

export interface CarePlanGoal {
  id: string;
  title: string;
  description: string;
  status?: string;
  targetDate?: string;
}

export interface CarePlanData {
  patientId: string | null;
  overallTitle: string;
  lastUpdated: string;
  goals: CarePlanGoal[];
  lifestyleDirectives: Array<{ category: string; icon: string; text: string }>;
}

export interface VitalRecord {
  id: string;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  respiratoryRate?: number;
  temperatureC?: string;
  oxygenSaturation?: number;
  recordedAt: string;
}

export interface VaccineRecord {
  id: string;
  name: string;
  dateGiven: string | null;
  doseNumber?: string;
  lotNumber?: string;
  manufacturer?: string;
  administeringProvider?: string;
  status: string;
  due: boolean;
  nextDueDate?: string | null;
  notes?: string;
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function usePatientRecords(patientId: string) {
  return useQuery<PatientRecordsData>({
    queryKey: ["patient-records", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/patient/records?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed to fetch clinical records");
      const json = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      return json.data;
    },
    enabled: Boolean(patientId),
    staleTime: 30_000,
  });
}

export function usePatientDocuments(patientId: string) {
  return useQuery<DocumentItem[]>({
    queryKey: ["patient-documents", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/documents?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed to fetch medical documents");
      const json = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      return Array.isArray(json.data) ? json.data : [];
    },
    enabled: Boolean(patientId),
    staleTime: 60_000,
  });
}

export function usePatientCarePlan(patientId: string) {
  return useQuery<CarePlanData>({
    queryKey: ["patient-care-plan", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/patient/care-plan?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed to fetch personalized care plan");
      const json = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      return json.data;
    },
    enabled: Boolean(patientId),
    staleTime: 60_000,
  });
}

export function usePatientVitals(patientId: string) {
  return useQuery<VitalRecord[]>({
    queryKey: ["patient-vitals", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/vitals?patientId=${patientId}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch vitals history");
      const json = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      return Array.isArray(json.data) ? json.data : [];
    },
    enabled: Boolean(patientId),
    staleTime: 15_000,
  });
}

export function usePatientVaccines(patientId: string) {
  return useQuery<VaccineRecord[]>({
    queryKey: ["patient-vaccines", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/immunizations?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed to fetch immunization records");
      const json = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      return Array.isArray(json.data) ? json.data : [];
    },
    enabled: Boolean(patientId),
    staleTime: 300_000,
  });
}

export function useRequestRefill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const res = await fetch(`/api/v1/prescriptions/${prescriptionId}/refill-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to request prescription refill");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-records"] });
    },
  });
}
