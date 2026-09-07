export interface SubmittedCase {
  caseId: string;
  patient: {
    fullName: string;
    age?: number;
    gender: string;
    dateOfBirth?: string;
    phone: string;
    email: string;
    address?: string;
    occupation?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    mrn?: string;
  };
  complaint: {
    chiefComplaint: string;
    severity: string;
    onset?: string;
    duration: string;
    location?: string;
    aggravating?: string;
    relieving?: string;
    associatedSymptoms?: string;
    previousSimilar?: boolean;
    seekingUrgent: boolean;
  };
  history?: {
    chronicConditions?: string;
    pastSurgeries?: string;
    currentMedications?: string;
    knownAllergies?: string;
    familyHistory?: string;
    socialHistory?: string;
    smokingStatus?: string;
    alcoholUse?: string;
    lastPhysicalExam?: string;
    primaryPhysician?: string;
  };
  symptoms?: {
    selectedCategories?: string[];
    painScale?: number;
    detailedDescription?: string;
    vitals?: {
      bloodPressure?: string;
      heartRate?: string;
      temperature?: string;
      respiratoryRate?: string;
      weight?: string;
      height?: string;
    };
    sleepImpact?: boolean;
    appetiteChange?: boolean;
    weightChange?: boolean;
  };
  filesCount?: number;
  fileNames?: string[];
  filesAttached?: { name: string; type: string }[];
  assignedHandler: string;
  handlerId: string;
  status: string;
  submittedAt: string;
  aiAnalysis?: any;
}

// Global in-memory cases store
declare global {
  var __NiniCasesStore: Map<string, SubmittedCase> | undefined;
}

if (!global.__NiniCasesStore) {
  global.__NiniCasesStore = new Map<string, SubmittedCase>();
}

export const casesStore = global.__NiniCasesStore;

export function addCase(newCase: SubmittedCase) {
  casesStore.set(newCase.caseId, newCase);
  return newCase;
}

export function getCaseById(caseId: string): SubmittedCase | null {
  return casesStore.get(caseId) || null;
}

export function getAllCases(): SubmittedCase[] {
  return Array.from(casesStore.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function updateCaseStatus(caseId: string, status: string, notes?: string): SubmittedCase | null {
  const existing = casesStore.get(caseId);
  if (!existing) return null;
  existing.status = status;
  casesStore.set(caseId, existing);
  return existing;
}
