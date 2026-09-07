import { callGeminiRest } from "../ai/gemini-rest-client";

export interface TriageVitals {
  temperatureC?: number | string;
  systolicBp?: number | string;
  diastolicBp?: number | string;
  heartRate?: number | string;
  respiratoryRate?: number | string;
  oxygenSaturation?: number | string;
}

export interface TriageInput {
  chiefComplaint: string;
  symptoms?: string | string[];
  duration?: string;
  severityScale?: number; // 1-10
  patientDemographics?: {
    age?: number;
    gender?: string;
    dateOfBirth?: string;
    isPregnant?: boolean;
  };
  vitals?: TriageVitals;
  medicalHistory?: {
    chronicConditions?: string[];
    knownAllergies?: string[];
    currentMedications?: string[];
  };
}

export interface TriageResult {
  urgencyLevel: "routine" | "urgent" | "emergency";
  recommendedSpecialty: string;
  possibleDiagnoses: string[];
  recommendedProviderType: string;
  estimatedTriageTime: string;
  redFlags: string[];
  recommendedTests: string[];
  summary: string;
  isEmergency: boolean;
  emergencyInstructions?: string;
  confidenceScore: number;
}

// Emergency Keywords requiring immediate clinical escalation
const EMERGENCY_PATTERNS = [
  /chest pain/i,
  /crushing chest/i,
  /radiating to (arm|jaw|back|neck)/i,
  /difficulty breathing/i,
  /severe shortness of breath/i,
  /stridor/i,
  /facial droop/i,
  /slurred speech/i,
  /sudden weakness/i,
  /loss of consciousness/i,
  /syncope/i,
  /anaphylaxis/i,
  /throat swelling/i,
  /severe hemorrhage/i,
  /uncontrolled bleeding/i,
  /worst headache of (my|life)/i,
  /thunderclap/i,
  /seizure/i,
  /poisoning|overdose/i,
  /suicidal ideation/i,
];

export class TriageService {
  /**
   * Perform rapid AI Triage with Emergency Red-Flag detection
   */
  static async assess(input: TriageInput): Promise<TriageResult> {
    const rawSymptomsText = Array.isArray(input.symptoms)
      ? input.symptoms.join(", ")
      : input.symptoms || "";
    const combinedText = `${input.chiefComplaint} ${rawSymptomsText}`.trim();

    // 1. Check for immediate emergency red flags via rule engine
    const emergencyDetected = this.checkImmediateEmergency(combinedText, input.vitals, input.severityScale);
    if (emergencyDetected.isEmergency) {
      return {
        urgencyLevel: "emergency",
        recommendedSpecialty: "Emergency Medicine / Trauma",
        possibleDiagnoses: emergencyDetected.causes,
        recommendedProviderType: "Emergency Physician / Critical Care Lead",
        estimatedTriageTime: "Immediate (0 min)",
        redFlags: emergencyDetected.redFlags,
        recommendedTests: ["Emergency ECG (12-Lead)", "Stat Cardiac Enzymes (Troponin I)", "Stat Point-of-Care Vitals & Blood Gas", "Bedside Ultrasound"],
        summary: `EMERGENCY ALERT: Potential life-threatening condition detected (${emergencyDetected.redFlags.join("; ")}). Immediate emergency intervention initiated.`,
        isEmergency: true,
        emergencyInstructions: "Seek emergency medical care immediately. If on-site, report to the Emergency Desk or call 911 / Local Emergency Line (+251 11 681 2000). Do not attempt to drive.",
        confidenceScore: 99,
      };
    }

    // 2. Call Gemini for deep clinical triage analysis
    try {
      const prompt = this.buildTriagePrompt(input);
      const restResult = await callGeminiRest({
        prompt,
        temperature: 0.1,
        maxOutputTokens: 2048,
      });

      const cleaned = restResult.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      const isUrgent = parsed.urgencyLevel === "urgent" || (input.severityScale && input.severityScale >= 7);

      return {
        urgencyLevel: parsed.urgencyLevel || (isUrgent ? "urgent" : "routine"),
        recommendedSpecialty: parsed.recommendedSpecialty || "General Internal Medicine",
        possibleDiagnoses: Array.isArray(parsed.possibleDiagnoses) ? parsed.possibleDiagnoses : ["Acute Upper Respiratory Infection", "Viral Syndrome"],
        recommendedProviderType: parsed.recommendedProviderType || "physician",
        estimatedTriageTime: parsed.estimatedTriageTime || (isUrgent ? "5-10 minutes" : "15-20 minutes"),
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        recommendedTests: Array.isArray(parsed.recommendedTests) ? parsed.recommendedTests : ["Basic Metabolic Panel", "Vital Signs Re-check"],
        summary: parsed.summary || `Clinical triage completed. Urgency: ${parsed.urgencyLevel || "routine"}.`,
        isEmergency: parsed.urgencyLevel === "emergency",
        emergencyInstructions: parsed.urgencyLevel === "emergency" ? "Immediate clinical review requested." : undefined,
        confidenceScore: parsed.confidenceScore || 92,
      };
    } catch (aiErr) {
      console.warn("[TriageService] Gemini fallback invoked:", aiErr);
      return this.heuristicTriage(input);
    }
  }

  /**
   * Fast emergency pattern checker
   */
  private static checkImmediateEmergency(
    text: string,
    vitals?: TriageVitals,
    severityScale?: number
  ): { isEmergency: boolean; redFlags: string[]; causes: string[] } {
    const redFlags: string[] = [];
    const causes: string[] = [];

    for (const pattern of EMERGENCY_PATTERNS) {
      if (pattern.test(text)) {
        redFlags.push(`Critical symptom keyword match: "${text.match(pattern)?.[0]}"`);
      }
    }

    if (vitals) {
      const spo2 = typeof vitals.oxygenSaturation === "number" ? vitals.oxygenSaturation : parseFloat(String(vitals.oxygenSaturation || "100"));
      const sbp = typeof vitals.systolicBp === "number" ? vitals.systolicBp : parseFloat(String(vitals.systolicBp || "120"));
      const hr = typeof vitals.heartRate === "number" ? vitals.heartRate : parseFloat(String(vitals.heartRate || "75"));
      const temp = typeof vitals.temperatureC === "number" ? vitals.temperatureC : parseFloat(String(vitals.temperatureC || "37"));

      if (!isNaN(spo2) && spo2 > 0 && spo2 < 90) {
        redFlags.push(`Critical Hypoxemia (SpO₂: ${spo2}%)`);
        causes.push("Severe Respiratory Distress / Pulmonary Embolism");
      }
      if (!isNaN(sbp) && sbp >= 190) {
        redFlags.push(`Hypertensive Crisis (Systolic: ${sbp} mmHg)`);
        causes.push("Acute Hypertensive Emergency / Target Organ Damage Risk");
      }
      if (!isNaN(hr) && (hr > 140 || hr < 40)) {
        redFlags.push(`Critical Hemodynamic Instability (Heart Rate: ${hr} bpm)`);
        causes.push("Symptomatic Arrhythmia / Hemodynamic Instability");
      }
      if (!isNaN(temp) && temp >= 40.0) {
        redFlags.push(`Hyperpyrexia (Temperature: ${temp}°C)`);
        causes.push("Severe Sepsis / CNS Infection");
      }
    }

    if (severityScale && severityScale >= 10 && redFlags.length > 0) {
      redFlags.push("Patient reports maximum acute pain severity (10/10)");
    }

    const isEmergency = redFlags.length > 0;
    if (isEmergency && causes.length === 0) {
      causes.push("Acute Coronary Syndrome", "Acute Cerebrovascular Event", "Severe Systemic Infection");
    }

    return { isEmergency, redFlags, causes };
  }

  /**
   * Deterministic heuristic fallback when offline
   */
  private static heuristicTriage(input: TriageInput): TriageResult {
    const complaint = input.chiefComplaint.toLowerCase();
    const severity = input.severityScale || 5;

    let specialty = "General Internal Medicine";
    let diagnoses = ["Acute Viral Pharyngitis / URI", "Tension Headache", "Musculoskeletal Strain"];
    let tests = ["Comprehensive Vital Signs Panel", "CBC with Differential"];
    let urgency: "routine" | "urgent" | "emergency" = "routine";
    let time = "15-20 minutes";

    if (severity >= 7 || /fever|pain|rash|burn|infection|uti|vomit/i.test(complaint)) {
      urgency = "urgent";
      time = "5-10 minutes";
    }

    if (/skin|rash|eczema|bite|lesion/i.test(complaint)) {
      specialty = "Dermatology & Urgent Care";
      diagnoses = ["Acute Contact Dermatitis", "Urticaria", "Cellulitis"];
      tests = ["Skin Lesion Inspection", "Dermoscopy"];
    } else if (/uti|urine|burning|bladder|kidney/i.test(complaint)) {
      specialty = "Urgent Care & Urology";
      diagnoses = ["Uncomplicated Urinary Tract Infection", "Cystitis", "Pyelonephritis Rule-Out"];
      tests = ["Rapid Urinalysis (Dipstick + Microscopic)", "Urine Culture & Sensitivity"];
    } else if (/cough|flu|throat|sinus|cold|congestion/i.test(complaint)) {
      specialty = "Family Medicine & Pulmonology";
      diagnoses = ["Acute Upper Respiratory Tract Infection", "Influenza Type A/B", "Acute Bacterial Sinusitis"];
      tests = ["Rapid Influenza A/B Antigen", "Rapid Strep A Ag", "COVID-19 Rapid Antigen"];
    } else if (/stomach|nausea|diarrhea|cramp|acid/i.test(complaint)) {
      specialty = "Gastroenterology & Family Practice";
      diagnoses = ["Acute Viral Gastroenteritis", "GERD / Gastritis Exacerbation", "Foodborne Enteritis"];
      tests = ["Electrolyte Panel", "Abdominal Examination"];
    } else if (/child|baby|infant|pediatric/i.test(complaint)) {
      specialty = "Pediatrics";
      diagnoses = ["Pediatric Febrile Illness", "Viral Exanthem"];
      tests = ["Pediatric Vital Signs", "Otoscopy"];
    }

    return {
      urgencyLevel: urgency,
      recommendedSpecialty: specialty,
      possibleDiagnoses: diagnoses,
      recommendedProviderType: "physician",
      estimatedTriageTime: time,
      redFlags: severity >= 8 ? ["High pain score reported by patient"] : [],
      recommendedTests: tests,
      summary: `Automated heuristic triage suggests ${specialty} consultation for "${input.chiefComplaint}". Urgency classified as ${urgency}.`,
      isEmergency: false,
      confidenceScore: 88,
    };
  }

  private static buildTriagePrompt(input: TriageInput): string {
    return `
You are an expert Clinical Decision Support System (CDSS) Triage Physician.
Analyze the following patient clinical presentation and provide immediate urgency classification and routing recommendations.

PATIENT PRESENTATION:
- Chief Complaint: ${input.chiefComplaint}
- Additional Symptoms: ${Array.isArray(input.symptoms) ? input.symptoms.join(", ") : input.symptoms || "None reported"}
- Duration: ${input.duration || "Unspecified"}
- Pain/Severity Scale (1-10): ${input.severityScale ?? "Not recorded"}
- Demographics: Age ${input.patientDemographics?.age ?? "Adult"}, Gender: ${input.patientDemographics?.gender ?? "Not specified"}
- Vitals: ${JSON.stringify(input.vitals || {})}
- Known Medical History: ${JSON.stringify(input.medicalHistory || {})}

REQUIREMENTS:
1. Urgency Level: "routine" | "urgent" | "emergency"
2. Recommended Specialty: e.g. "General Internal Medicine", "Pediatrics", "Cardiology", "Dermatology", "Urgent Care & Family Medicine"
3. Recommended Provider Type: "physician" | "nurse_practitioner" | "specialist"
4. Possible Diagnoses: top 3 clinical differentials
5. Red Flags: any cautionary symptoms or warning indicators
6. Recommended Tests: suggested point-of-care or laboratory diagnostics
7. Summary: 1-2 sentence concise clinical briefing for the assigned provider.

Return ONLY a valid JSON object strictly matching this schema:
{
  "urgencyLevel": "routine" | "urgent" | "emergency",
  "recommendedSpecialty": "string",
  "possibleDiagnoses": ["string", "string", "string"],
  "recommendedProviderType": "physician" | "nurse_practitioner" | "specialist",
  "estimatedTriageTime": "string (e.g. 5 minutes)",
  "redFlags": ["string"],
  "recommendedTests": ["string", "string"],
  "summary": "string",
  "confidenceScore": 95
}
`;
  }
}
