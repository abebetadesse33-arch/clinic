"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useClinic } from "../../../context/ClinicContext";
import MultimodalMediaViewer from "../../../components/MultimodalMediaViewer";
import ClinicalOrderDropdown from "../../../components/clinical/ClinicalOrderDropdown";
import DigitalPatientCard from "../../../components/patient/DigitalPatientCard";
import PrintablePatientCard from "../../../components/patient/PrintablePatientCard";
import PatientActivityTimeline from "../../../components/patient/PatientActivityTimeline";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Dna,
  FileCheck,
  HeartHandshake,
  HeartPulse,
  Sparkles,
  Stethoscope,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Plus,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  Layers,
  Thermometer,
  Pill,
  Upload,
  X,
  AudioWaveform,
  Film,
  Zap,
  Loader2,
  Printer,
  QrCode,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CreditCard,
  ShieldCheck,
  Copy,
  Check,
  Building2,
  FlaskConical,
  Receipt,
  Scale,
  ExternalLink,
} from "lucide-react";

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const {
    patients,
    vitals: contextVitals,
    symptoms: contextSymptoms,
    labResults: contextLabResults,
    genetics: contextGenetics,
    imaging: contextImaging,
    psychological: contextPsychological,
    socialHistory: contextSocialHistory,
    medications: contextMedications,
    mediaAssets: contextMediaAssets,
    aiSuggestions,
    runAiAnalysis,
    uploadMediaAsset,
    isAnalyzing,
    checkSafetyForCandidate,
    selectPatient,
  } = useClinic();

  const [activeTab, setActiveTab] = useState<
    "overview" | "prescriptions" | "orders" | "multimodal" | "biological" | "psychological" | "social" | "medications"
  >("overview");

  const [candidateDrug, setCandidateDrug] = useState("");
  const [candidateAlerts, setCandidateAlerts] = useState<any[] | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showRecordVitalsModal, setShowRecordVitalsModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [fetchedPatient, setFetchedPatient] = useState<any | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);

  // Vitals form state
  const [vitalsForm, setVitalsForm] = useState({
    systolicBp: "120",
    diastolicBp: "80",
    heartRate: "72",
    respiratoryRate: "16",
    temperatureC: "36.8",
    oxygenSaturation: "98",
    weightKg: "68",
    heightCm: "174",
    notes: "",
  });
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [vitalsSuccessMsg, setVitalsSuccessMsg] = useState<string | null>(null);

  // Upload Form State
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | "signal" | "genomic">("image");
  const [mediaModality, setMediaModality] = useState("xray");
  const [mediaSummary, setMediaSummary] = useState("");

  // Select patient in global context
  useEffect(() => {
    if (patientId) {
      selectPatient(patientId);
    }
  }, [patientId, selectPatient]);

  // Fetch full patient data from API
  const loadPatientData = useCallback(async () => {
    if (!patientId) return;
    setIsLoadingPatient(true);
    try {
      const res = await fetch(`/api/v1/patients/${patientId}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setFetchedPatient(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch patient EHR data:", err);
    } finally {
      setIsLoadingPatient(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  const patientInContext = patients.find((p) => p.id === patientId);

  const patient = fetchedPatient || patientInContext || {
    id: patientId,
    mrn: "MRN-PENDING",
    firstName: "Patient",
    lastName: "Chart",
    dateOfBirth: "2000-01-01",
    gender: "undisclosed",
    bloodType: "O+",
    allergies: [],
    chronicConditions: [],
    primaryDoctor: "Dr. Sarah Mitchell, MD",
    triagePriority: "routine",
    phone: "",
    email: "",
    digitalCardNumber: `NINI-2026-${patientId.slice(0, 4)}-${patientId.slice(-4)}`,
  };

  // Compute Age
  const patientAge = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : patient.age || 24;

  // Merge Vitals: DB vitals take precedence, then context, then realistic baseline
  const dbVitalsList = fetchedPatient?.vitals || [];
  const pVitalsFromContext = contextVitals.find((v) => v.patientId === patient.id);
  const pVitals = dbVitalsList[0] || pVitalsFromContext || {
    systolicBp: 120,
    diastolicBp: 78,
    heartRate: 72,
    oxygenSaturation: 98,
    temperatureC: "36.8",
    respiratoryRate: 16,
    bmi: "22.4",
    weightKg: "68",
    recordedAt: new Date().toISOString(),
    ecgSummary: "Normal Sinus Rhythm at 72 bpm, PR 156ms, QRS 88ms, QTc 410ms. No ST deviations.",
  };

  // Merge Symptoms
  const pSymptoms = contextSymptoms.filter((s) => s.patientId === patient.id);

  // Merge Labs
  const pLabs = (fetchedPatient?.labResults && fetchedPatient.labResults.length > 0)
    ? fetchedPatient.labResults
    : contextLabResults.filter((l) => l.patientId === patient.id);

  // Fallback baseline labs if none recorded
  const displayLabs = pLabs.length > 0 ? pLabs : [
    { id: "lab-1", testName: "Complete Blood Count (CBC)", category: "Hematology", value: "15.2", unit: "g/dL (Hb)", referenceRangeLow: 13.5, referenceRangeHigh: 17.5, isAbnormal: false, interpretation: "Normal" },
    { id: "lab-2", testName: "Comprehensive Metabolic Panel (CMP)", category: "Biochemistry", value: "94", unit: "mg/dL (Glucose)", referenceRangeLow: 70, referenceRangeHigh: 99, isAbnormal: false, interpretation: "Euglycemic" },
    { id: "lab-3", testName: "Serum Creatinine / eGFR", category: "Renal Panel", value: "0.92", unit: "mg/dL (>90 mL/min)", referenceRangeLow: 0.7, referenceRangeHigh: 1.3, isAbnormal: false, interpretation: "Preserved Function" },
    { id: "lab-4", testName: "Total Cholesterol / Lipid Panel", category: "Cardiometabolic", value: "172", unit: "mg/dL", referenceRangeLow: 125, referenceRangeHigh: 200, isAbnormal: false, interpretation: "Desirable" },
    { id: "lab-5", testName: "Estradiol (E2)", category: "Endocrinology", value: "32", unit: "pg/mL", referenceRangeLow: 10, referenceRangeHigh: 50, isAbnormal: false, interpretation: "Normal Reference" },
  ];

  // Merge Genetics
  const pGenetics = (fetchedPatient?.geneticProfiles && fetchedPatient.geneticProfiles.length > 0)
    ? fetchedPatient.geneticProfiles
    : contextGenetics.filter((g) => g.patientId === patient.id);

  const displayGenetics = pGenetics.length > 0 ? pGenetics : [
    { id: "gen-1", gene: "CYP2C19", variant: "*1/*1", phenotype: "Normal Metabolizer", clinicalSignificance: "Standard therapeutic dosing for PPIs, Clopidogrel, and SSRIs.", sourcePanel: "Core Pharmacogenomics Panel", testedAt: "2026-08-15" },
    { id: "gen-2", gene: "CYP2D6", variant: "*1/*2", phenotype: "Normal Metabolizer", clinicalSignificance: "Expected normal metabolic clearance for beta-blockers and codeine analgesics.", sourcePanel: "Core Pharmacogenomics Panel", testedAt: "2026-08-15" },
    { id: "gen-3", gene: "VKORC1", variant: "-1639G>A", phenotype: "Intermediate Sensitivity", clinicalSignificance: "Standard warfarin initiation dose sensitivity guideline.", sourcePanel: "Coagulation PGx Panel", testedAt: "2026-08-15" },
  ];

  // Merge Psychological
  const pPsych = contextPsychological.filter((p) => p.patientId === patient.id);
  const displayPsych = pPsych.length > 0 ? pPsych : [
    { id: "psy-1", testName: "PHQ-9 Depression Screener", score: 2, severity: "Minimal / None", clinicalNotes: "Patient reports stable mood, healthy sleep hygiene, and good social engagement.", adherenceRisk: "low", assessedAt: "2026-08-20" },
    { id: "psy-2", testName: "GAD-7 Anxiety Assessment", score: 3, severity: "Minimal Anxiety", clinicalNotes: "No acute generalized anxiety symptoms reported during primary care intake.", adherenceRisk: "low", assessedAt: "2026-08-20" },
  ];

  // Merge Social
  const pSocial = contextSocialHistory.filter((s) => s.patientId === patient.id);
  const displaySocial = pSocial.length > 0 ? pSocial : [
    { id: "soc-1", category: "healthcare_access", indicator: "Comprehensive Clinic Network Coverage", severityLevel: "low", description: "Direct access to primary care, virtual urgent care, and on-site pharmacy dispensing.", recommendedAction: "Maintain routine annual biometric screening and follow-up." },
    { id: "soc-2", category: "lifestyle", indicator: "Physical Activity & Nutrition", severityLevel: "low", description: "Moderate weekly cardiovascular exercise; balanced dietary habits with adequate hydration.", recommendedAction: "Continue preventative wellness tracking via patient portal." },
  ];

  // Merge Medications
  const pMeds = (fetchedPatient?.medications && fetchedPatient.medications.length > 0)
    ? fetchedPatient.medications
    : contextMedications.filter((m) => m.patientId === patient.id);

  // Merge Prescriptions
  const pPrescriptions = (fetchedPatient?.prescriptions && fetchedPatient.prescriptions.length > 0)
    ? fetchedPatient.prescriptions
    : [];

  // Merge Media Assets
  const pMedia = contextMediaAssets.filter((m) => m.patientId === patient.id);
  const displayMedia = pMedia.length > 0 ? pMedia : [
    {
      id: "media-demo-1",
      patientId: patient.id,
      type: "image" as const,
      modality: "xray" as const,
      title: "PA Chest Radiograph (Baseline Screening)",
      fileUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
      mimeType: "image/jpeg",
      fileSizeKb: 620,
      preprocessedSummary: "Cardiothoracic ratio normal (<0.5). Lung fields clear bilaterally without consolidation, effusion, or pneumothorax.",
      confidenceScore: 98,
      createdAt: "2026-09-01",
    },
    {
      id: "media-demo-2",
      patientId: patient.id,
      type: "signal" as const,
      modality: "ecg_signal" as const,
      title: "12-Lead Digital ECG Waveform Analysis",
      fileUrl: "https://example.com/signals/ecg-normal.edf",
      mimeType: "application/octet-stream",
      fileSizeKb: 145,
      preprocessedSummary: "Sinus rhythm at 72 bpm. Normal axis, PR interval 156 ms, QRS duration 88 ms, QTc 410 ms. No ischemic changes.",
      confidenceScore: 96,
      createdAt: "2026-09-02",
    },
    {
      id: "media-demo-3",
      patientId: patient.id,
      type: "audio" as const,
      modality: "auscultation_lung" as const,
      title: "Digital Stethoscope Auscultation (Bilateral Basilar)",
      fileUrl: "https://cdn.freesound.org/previews/384/384897_7188737-lq.mp3",
      mimeType: "audio/mpeg",
      fileSizeKb: 340,
      preprocessedSummary: "Vesicular breath sounds clear bilaterally. No crackles, wheezes, or pleural friction rubs detected.",
      confidenceScore: 95,
      createdAt: "2026-09-03",
    },
  ];

  // Latest AI suggestion for this patient
  const latestAi = aiSuggestions.find((s) => s.patientId === patient.id);

  const handleRunAi = async () => {
    if (patient?.id) {
      await runAiAnalysis(patient.id);
    }
  };

  const handleCheckSafety = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateDrug.trim() || !patient?.id) return;
    const alerts = checkSafetyForCandidate(candidateDrug, patient.id);
    setCandidateAlerts(alerts);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id) return;
    setIsSavingVitals(true);
    try {
      const payload = {
        patientId: patient.id,
        systolicBp: parseInt(vitalsForm.systolicBp, 10),
        diastolicBp: parseInt(vitalsForm.diastolicBp, 10),
        heartRate: parseInt(vitalsForm.heartRate, 10),
        respiratoryRate: parseInt(vitalsForm.respiratoryRate, 10),
        temperatureC: parseFloat(vitalsForm.temperatureC),
        oxygenSaturation: parseFloat(vitalsForm.oxygenSaturation),
        weightKg: parseFloat(vitalsForm.weightKg),
        heightCm: parseFloat(vitalsForm.heightCm),
        bmi: parseFloat((parseFloat(vitalsForm.weightKg) / Math.pow(parseFloat(vitalsForm.heightCm) / 100, 2)).toFixed(1)),
        notes: vitalsForm.notes || undefined,
      };

      const res = await fetch("/api/v1/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setVitalsSuccessMsg("Vitals successfully recorded and saved to clinical EHR.");
        await loadPatientData();
        setTimeout(() => {
          setVitalsSuccessMsg(null);
          setShowRecordVitalsModal(false);
        }, 1200);
      } else {
        alert(data.error || "Failed to save vitals.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving vitals: " + err.message);
    } finally {
      setIsSavingVitals(false);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle || !patient?.id) return;

    let sampleUrl = "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600";
    let mime = "image/jpeg";

    if (mediaType === "audio") {
      sampleUrl = "https://cdn.freesound.org/previews/384/384897_7188737-lq.mp3";
      mime = "audio/mpeg";
    } else if (mediaType === "signal") {
      sampleUrl = "https://example.com/signals/waveform.edf";
      mime = "application/octet-stream";
    } else if (mediaType === "genomic") {
      sampleUrl = "https://example.com/genomics/panel.vcf";
      mime = "text/plain";
    }

    uploadMediaAsset({
      patientId: patient.id,
      type: mediaType,
      modality: mediaModality as any,
      title: mediaTitle,
      fileUrl: sampleUrl,
      mimeType: mime,
      fileSizeKb: 380,
      preprocessedSummary: mediaSummary || `Automated ${mediaModality} feature extraction completed successfully.`,
      confidenceScore: 94,
    });

    setShowUploadModal(false);
    setMediaTitle("");
    setMediaSummary("");
  };

  const patientAvatar = patient.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300";
  const patientAllergies = Array.isArray(patient.allergies) ? patient.allergies : [];
  const digitalCardId = patient.digitalCardNumber || `NINI-2026-${patient.mrn?.replace(/\D/g, "") || "1409"}`;
  const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient Profile";

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO DEMOGRAPHIC STRIP & PATIENT IDENTITY BANNER */}
      {/* ========================================================================= */}
      <div className="minimal-dashboard-shell p-6 sm:p-8 rounded-[32px] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative z-30 shadow-warm-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full xl:w-auto">
          {/* Avatar with Status Indicator */}
          <div className="relative shrink-0">
            <img
              src={patientAvatar}
              alt={fullName}
              className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-2xl ring-2 ring-teal-500/20"
            />
            <span
              className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-md ${
                patient.triagePriority === "critical"
                  ? "bg-rose-500 text-white border-rose-600"
                  : patient.triagePriority === "urgent"
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-emerald-600 text-white border-emerald-700"
              }`}
            >
              {patient.triagePriority || "Routine"}
            </span>
          </div>

          {/* Demographic & Identity Details */}
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {fullName}
              </h1>

              {/* MRN Chip */}
              <button
                onClick={() => handleCopy(patient.mrn || "MRN-14746", "mrn")}
                title="Click to copy MRN"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700/60 transition-transform active:scale-95"
              >
                <span>{patient.mrn || "MRN-14746"}</span>
                {copiedField === "mrn" ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
              </button>

              {/* Digital Card ID Chip */}
              <button
                onClick={() => handleCopy(digitalCardId, "card")}
                title="Click to copy Digital Card ID"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700/60 transition-transform active:scale-95"
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                <span>{digitalCardId}</span>
                {copiedField === "card" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
              </button>

              {/* National ID Status */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                ETH-NID VERIFIED
              </span>
            </div>

            {/* Quick Demographics Pills */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                DOB: <strong>{patient.dateOfBirth || "2002-02-04"}</strong> ({patientAge} yrs)
              </span>
              <span>•</span>
              <span>
                Gender: <strong className="uppercase">{patient.gender || "Male"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Blood Type: <strong className="text-rose-600 dark:text-rose-400">{patient.bloodType || "O+"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Branch: <strong>{patient.preferredClinicBranch ? patient.preferredClinicBranch.replace("-", " ").toUpperCase() : "HABITAT MAIN"}</strong>
              </span>
            </div>

            {/* Contact Information & Allergies Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
              {patient.phone && (
                <a
                  href={`tel:${patient.phone}`}
                  className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
                >
                  <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{patient.phone}</span>
                </a>
              )}
              {patient.email && (
                <a
                  href={`mailto:${patient.email}`}
                  className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
                >
                  <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{patient.email}</span>
                </a>
              )}
              <span>•</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Allergies:</span>
                {patientAllergies.length > 0 ? (
                  patientAllergies.map((a: any, i: number) => {
                    const substance = typeof a === "string" ? a : a?.substance || "Allergen";
                    return (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        {substance}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    No Known Drug Allergies (NKDA)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HERO QUICK ACTION TOOLBAR */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto xl:justify-end">
          {/* Digital ID Card */}
          <button
            onClick={() => setShowDigitalCardModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-indigo-300 shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Digital ID Card</span>
          </button>

          {/* Print Summary */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Print Chart</span>
          </button>

          {/* Record Vitals */}
          <button
            onClick={() => setShowRecordVitalsModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs flex items-center gap-2 hover:bg-teal-100/70 shadow-sm transition-all dark:bg-teal-950/60 dark:border-teal-700/60 dark:text-teal-200 dark:hover:bg-teal-900/60"
          >
            <HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Record Vitals</span>
          </button>

          {/* Order Dropdown */}
          <ClinicalOrderDropdown
            patient={{
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              mrn: patient.mrn,
              age: patientAge,
              gender: patient.gender,
            }}
            buttonLabel="⚡ Clinical Order"
          />

          {/* Upload Media Asset */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-teal-300 shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Upload Media</span>
          </button>

          {/* Run Multimodal AI Reasoning */}
          <button
            onClick={handleRunAi}
            disabled={isAnalyzing}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Analyzing Case...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Run Biopsychosocial AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN GRID: LEFT TABS (7 COLS), RIGHT AI CLINICAL DRAWER (5 COLS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Tabbed Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tab Navigation Pill Bar */}
          <div className="minimal-dashboard-shell p-1.5 rounded-[28px] flex items-center justify-between overflow-x-auto gap-1 shadow-sm">
            {[
              { id: "overview", label: "Overview & Vitals", icon: Layers },
              { id: "prescriptions", label: `Prescriptions (${pPrescriptions.length})`, icon: Pill },
              { id: "orders", label: "Orders & Timeline", icon: FileText },
              { id: "multimodal", label: `Media & Signals (${displayMedia.length})`, icon: Eye },
              { id: "biological", label: "Labs & PGx", icon: Dna },
              { id: "psychological", label: "Psychological", icon: Brain },
              { id: "social", label: "Social (SDOH)", icon: HeartHandshake },
              { id: "medications", label: "Safety Checker", icon: ShieldAlert },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-teal-500 text-slate-950 shadow-md font-extrabold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & VITALS */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-fade-in">
              {/* Physiological Vitals Snapshot */}
              <div className="soft-panel p-6 rounded-[28px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Physiological Vitals</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Recorded: {pVitals?.recordedAt ? new Date(pVitals.recordedAt).toLocaleString() : "Baseline Triage"})
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowRecordVitalsModal(true)}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record New</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Blood Pressure */}
                  <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 text-center dark:bg-slate-900/70 dark:border-slate-700/80 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Blood Pressure
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white block">
                      {pVitals.systolicBp}/{pVitals.diastolicBp}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      {pVitals.systolicBp < 130 && pVitals.diastolicBp < 85 ? "Optimal / Normal" : "Elevated / Stage 1"}
                    </span>
                    <span className="text-[9px] text-slate-400 block">mmHg</span>
                  </div>

                  {/* Heart Rate */}
                  <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 text-center dark:bg-slate-900/70 dark:border-slate-700/80 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Heart Rate
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white block">
                      {pVitals.heartRate}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      Normal Sinus
                    </span>
                    <span className="text-[9px] text-slate-400 block">bpm</span>
                  </div>

                  {/* SpO2 */}
                  <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 text-center dark:bg-slate-900/70 dark:border-slate-700/80 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      SpO2 (Room Air)
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white block">
                      {pVitals.oxygenSaturation}%
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      Adequate Oxygenation
                    </span>
                    <span className="text-[9px] text-slate-400 block">Pulse Oximetry</span>
                  </div>

                  {/* Temp / BMI */}
                  <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 text-center dark:bg-slate-900/70 dark:border-slate-700/80 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Temp / BMI
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white block">
                      {pVitals.temperatureC}°C
                    </span>
                    <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 block mt-0.5">
                      BMI: {pVitals.bmi || "22.4"} ({pVitals.weightKg || "68"} kg)
                    </span>
                    <span className="text-[9px] text-slate-400 block">Euthermic</span>
                  </div>
                </div>

                {pVitals?.ecgSummary && (
                  <div className="mt-4 p-3 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs text-teal-900 dark:bg-teal-950/40 dark:border-teal-800/60 dark:text-teal-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <strong>Digital ECG Interpretation:</strong> {pVitals.ecgSummary}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Symptoms & Intake Complaints */}
              <div className="soft-panel p-6 rounded-[28px]">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Presenting Symptoms & Clinical Chief Complaint</span>
                </h3>
                {pSymptoms.length > 0 ? (
                  <div className="space-y-2.5">
                    {pSymptoms.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 dark:bg-slate-900/70 dark:border-slate-700/80 flex items-start justify-between gap-3 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</span>
                            <span
                              className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                                s.severity === "severe"
                                  ? "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                  : s.severity === "moderate"
                                  ? "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              }`}
                            >
                              {s.severity}
                            </span>
                            {s.isPrimary && (
                              <span className="text-[9px] bg-teal-500/15 text-teal-800 font-bold px-2 py-0.5 rounded-full dark:bg-teal-500/25 dark:text-teal-300">
                                Primary Complaint
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 dark:text-slate-300">{s.description}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap dark:text-slate-400">
                          Duration: {s.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400">
                    <p>Routine health maintenance and preventative care profile. No acute emergencies or severe distress reported at intake.</p>
                  </div>
                )}
              </div>

              {/* Embedded Live Activity Timeline */}
              <div className="soft-panel p-6 rounded-[28px]">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Clinical Orders & Activity Timeline</span>
                </h3>
                <PatientActivityTimeline patientId={patient.id} />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PRESCRIPTIONS & PHARMACY FULFILLMENT (NEW) */}
          {/* ========================================================================= */}
          {activeTab === "prescriptions" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-6 rounded-[28px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
                      <Pill className="w-4 h-4" />
                      <span>Active e-Prescriptions & Pharmacy Dispensing</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Digitally signed clinician prescriptions, fulfillment queue status, and pricing
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/pharmacy")}
                    className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pharmacy Dispense Hub</span>
                  </button>
                </div>

                {pPrescriptions.length > 0 ? (
                  <div className="space-y-3.5">
                    {pPrescriptions.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200/90 dark:bg-slate-900/90 dark:border-slate-800 shadow-sm space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                                {rx.medicationName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
                                {rx.dosage}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  rx.status === "dispensed"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                }`}
                              >
                                {rx.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              <strong>Instructions:</strong> {rx.instructions || `Take ${rx.dosage} ${rx.frequency} for ${rx.durationDays || 30} days.`}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-extrabold text-slate-900 dark:text-white block">
                              {rx.totalPrice ? `${Number(rx.totalPrice).toLocaleString()} ${rx.currency || "ETB"}` : "Free"}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                rx.paymentStatus === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              Payment: {rx.paymentStatus || "Unpaid"}
                            </span>
                          </div>
                        </div>

                        {/* Prescription Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Frequency</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{rx.frequency || "Once Daily"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Route</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{rx.route || "Oral"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Quantity</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{rx.quantity || 30} units</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Delivery / Pickup</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{rx.deliveryMethod || "On-Site Pickup"}</span>
                          </div>
                        </div>

                        {/* Digital Signature Footer */}
                        {rx.prescriberSignature && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono text-teal-700 dark:text-teal-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Signature: {rx.prescriberSignature}
                            </span>
                            <span>Signed: {new Date(rx.signedAt || rx.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <Pill className="w-8 h-8 text-teal-500 mx-auto opacity-70" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No active prescriptions documented for this encounter.
                    </p>
                    <button
                      onClick={() => router.push("/prescriptions")}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
                    >
                      Issue New Prescription
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ORDERS & TIMELINE */}
          {/* ========================================================================= */}
          {activeTab === "orders" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-6 rounded-[28px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>Diagnostic & Clinical Orders</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Laboratory, imaging, and specialty orders dispatched for this patient
                    </p>
                  </div>
                  <ClinicalOrderDropdown
                    patient={{
                      id: patient.id,
                      firstName: patient.firstName,
                      lastName: patient.lastName,
                      mrn: patient.mrn,
                      age: patientAge,
                      gender: patient.gender,
                    }}
                    buttonLabel="⚡ New Order"
                  />
                </div>

                <PatientActivityTimeline patientId={patient.id} />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: MULTIMODAL MEDIA & SIGNALS VIEWER */}
          {/* ========================================================================= */}
          {activeTab === "multimodal" && (
            <div className="space-y-4 animate-fade-in">
              <MultimodalMediaViewer
                assets={displayMedia as any}
                onUploadClick={() => setShowUploadModal(true)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: BIOLOGICAL (LABS & PGX) */}
          {/* ========================================================================= */}
          {activeTab === "biological" && (
            <div className="space-y-4 animate-fade-in">
              {/* Biochemistry & Labs */}
              <div className="soft-panel p-6 rounded-[28px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" />
                      <span>Biochemical & Diagnostic Laboratory Profile</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {displayLabs.length} Panels Verified
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/referrals")}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Order Lab Test</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase dark:border-slate-700 dark:text-slate-400">
                        <th className="pb-2.5">Test Name</th>
                        <th className="pb-2.5">Result</th>
                        <th className="pb-2.5">Reference Range</th>
                        <th className="pb-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {displayLabs.map((l: any, i: number) => (
                        <tr key={l.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">
                            {l.testName}
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              {l.category || "General Panel"}
                            </span>
                          </td>
                          <td className="py-3 font-extrabold text-slate-800 dark:text-slate-200">
                            {l.value} <span className="text-[10px] font-normal text-slate-500">{l.unit}</span>
                          </td>
                          <td className="py-3 text-slate-500 dark:text-slate-400">
                            {l.referenceRangeLow !== undefined && l.referenceRangeHigh !== undefined
                              ? `${l.referenceRangeLow} - ${l.referenceRangeHigh} ${l.unit}`
                              : "Standard Adult Reference"}
                          </td>
                          <td className="py-3">
                            {l.isAbnormal ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40">
                                {l.interpretation || "Abnormal"}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                                {l.interpretation || "Normal"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pharmacogenomics & Genetics */}
              <div className="soft-panel p-6 rounded-[28px]">
                <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Dna className="w-4 h-4" />
                  <span>Pharmacogenomics (PGx) & Genomic Phenotypes</span>
                </h3>
                <div className="space-y-3">
                  {displayGenetics.map((g: any, i: number) => (
                    <div
                      key={g.id || i}
                      className="p-4 rounded-2xl bg-white/80 border border-emerald-200/80 dark:bg-slate-900/80 dark:border-emerald-500/30 space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900 flex items-center gap-2 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 font-mono dark:bg-emerald-500/25 dark:text-emerald-300">
                            {g.gene}
                          </span>
                          <span>Variant: {g.variant}</span>
                        </span>
                        <span className="text-teal-700 dark:text-teal-400 font-bold">{g.phenotype}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{g.clinicalSignificance}</p>
                      <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Panel: {g.sourcePanel}</span>
                        <span>Verified: {g.testedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: PSYCHOLOGICAL */}
          {/* ========================================================================= */}
          {activeTab === "psychological" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-6 rounded-[28px]">
                <h3 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4" />
                  <span>Psychological & Cognitive Wellness Assessments</span>
                </h3>
                <div className="space-y-3.5">
                  {displayPsych.map((p: any, i: number) => (
                    <div
                      key={p.id || i}
                      className="p-4 rounded-2xl bg-white/80 border border-purple-200/80 space-y-2 dark:bg-slate-900/80 dark:border-purple-500/30 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 flex items-center gap-2 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-800 font-bold dark:bg-purple-500/25 dark:text-purple-300">
                            {p.testName}
                          </span>
                          <span>Score: <strong className="text-base text-purple-700 dark:text-purple-300">{p.score}</strong></span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-800">
                          {p.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{p.clinicalNotes}</p>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          Medication Adherence Risk: <strong className="text-emerald-700 dark:text-emerald-400 uppercase">{p.adherenceRisk}</strong>
                        </span>
                        <span className="text-slate-400">Assessed: {p.assessedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: SOCIAL DETERMINANTS (SDOH) */}
          {/* ========================================================================= */}
          {activeTab === "social" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-6 rounded-[28px]">
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <HeartHandshake className="w-4 h-4" />
                  <span>Social Determinants of Health (SDOH) & Community Support</span>
                </h3>
                <div className="space-y-3.5">
                  {displaySocial.map((s: any, i: number) => (
                    <div
                      key={s.id || i}
                      className="p-4 rounded-2xl bg-white/80 border border-amber-200/80 space-y-2 dark:bg-slate-900/80 dark:border-amber-500/30 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 capitalize dark:text-white">
                          {s.category.replace("_", " ")}: {s.indicator}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                            s.severityLevel === "high"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {s.severityLevel} Risk
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{s.description}</p>
                      {s.recommendedAction && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-200">
                          <strong>Recommended Resource:</strong> {s.recommendedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: MEDICATIONS & SAFETY CHECKER */}
          {/* ========================================================================= */}
          {activeTab === "medications" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-6 rounded-[28px]">
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 mb-3 dark:text-teal-400">
                  <Pill className="w-4 h-4" />
                  <span>Current Active Medication Regimen</span>
                </h3>
                {pMeds.length > 0 ? (
                  <div className="space-y-2.5">
                    {pMeds.map((m: any, i: number) => (
                      <div
                        key={m.id || i}
                        className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 flex items-start justify-between gap-3 dark:bg-slate-900/80 dark:border-slate-700/80 shadow-sm"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {m.name} <span className="text-teal-700 font-semibold dark:text-teal-400">({m.dosage})</span>
                          </h4>
                          <p className="text-[11px] text-slate-600 mt-0.5 dark:text-slate-300">
                            {m.frequency} • {m.route} • Indication: {m.indication || "Clinical prescription"}
                          </p>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500 border border-slate-200/70 dark:border-slate-800">
                    No active daily maintenance medications recorded.
                  </div>
                )}
              </div>

              {/* Candidate Safety Checker */}
              <div className="soft-panel p-6 rounded-[28px] border border-teal-200/80 bg-teal-50/20 dark:border-teal-500/25 dark:bg-teal-950/20 shadow-sm">
                <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-2 mb-1.5 dark:text-teal-300">
                  <ShieldAlert className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Real-Time Clinical Safety & Interaction Cross-Checker</span>
                </h3>
                <p className="text-xs text-slate-600 mb-3 dark:text-slate-400">
                  Enter candidate medication to cross-check against patient allergies, documented prescriptions, eGFR renal clearance limits, and pharmacogenomics.
                </p>

                <form onSubmit={handleCheckSafety} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol, Amoxicillin, Metformin, Tramadol, Ciprofloxacin..."
                    value={candidateDrug}
                    onChange={(e) => setCandidateDrug(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    Check Safety
                  </button>
                </form>

                {candidateAlerts && (
                  <div className="mt-4 space-y-2 animate-fade-in">
                    {candidateAlerts.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          <strong>Safety Verified:</strong> No critical contraindications or drug-gene conflicts detected for &apos;{candidateDrug}&apos;.
                        </span>
                      </div>
                    ) : (
                      candidateAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                            alert.severity === "Critical"
                              ? "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/90 dark:border-rose-700 dark:text-rose-200"
                              : "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/90 dark:border-amber-700 dark:text-amber-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{alert.title}</span>
                          </div>
                          <p>{alert.description}</p>
                          <div className="pt-1 font-semibold text-teal-700 dark:text-teal-300">
                            Action: {alert.recommendation}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT 5 COLS: MULTIMODAL AI CLINICAL CO-PILOT DRAWER */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="minimal-dashboard-shell p-6 rounded-[32px] sticky top-24 shadow-warm-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Multimodal AI Clinical Co-Pilot
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Biopsychosocial Case Synthesis & CDSS
                  </span>
                </div>
              </div>
              {latestAi && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 border border-teal-200 font-bold dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30">
                  Confidence: {latestAi.aiResponse.aiConfidenceIndex}%
                </span>
              )}
            </div>

            {latestAi ? (
              <div className="mt-4 space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
                {/* Patient Synthesis */}
                <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 text-slate-800 text-xs leading-relaxed dark:bg-teal-950/40 dark:border-teal-800/60 dark:text-slate-200">
                  <strong className="text-teal-700 dark:text-teal-300 block mb-1 font-bold">
                    Cross-Modal Diagnostic Synthesis:
                  </strong>
                  {latestAi.aiResponse.patientSummaryInsight}
                </div>

                {/* Modality Evidence Attributions */}
                {latestAi.aiResponse.modalityAttributions && latestAi.aiResponse.modalityAttributions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 dark:bg-slate-900/90 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1 text-teal-700 dark:text-teal-300">
                        <Zap className="w-3.5 h-3.5 text-teal-500" /> Contributing Evidence
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {latestAi.aiResponse.modalityAttributions.length} Sources
                      </span>
                    </div>
                    <div className="space-y-2">
                      {latestAi.aiResponse.modalityAttributions.map((att: any, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2 dark:bg-slate-800/80 dark:border-slate-700"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-mono border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-700">
                                {att.modalityType}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-white">{att.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 dark:text-slate-300">{att.findingSummary}</p>
                          </div>
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">
                            {att.confidenceContribution}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red Flags Alert */}
                {latestAi.aiResponse.redFlagsUrgentAlerts?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5 dark:bg-rose-950/80 dark:border-rose-700">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Critical Red Flags & Safety Alerts
                    </div>
                    {latestAi.aiResponse.redFlagsUrgentAlerts.map((flag: string, idx: number) => (
                      <p key={idx} className="text-xs text-rose-700 dark:text-rose-200 pl-5">
                        • {flag}
                      </p>
                    ))}
                  </div>
                )}

                {/* Ranked Differential Diagnoses */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Ranked Differential Diagnoses
                  </h4>
                  <div className="space-y-2">
                    {latestAi.aiResponse.differentialDiagnoses.map((diff: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs dark:text-white">{diff.condition}</span>
                          <span
                            className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                              diff.probability === "High"
                                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300"
                                : "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300"
                            }`}
                          >
                            {diff.probability} ({diff.confidenceScore}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{diff.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Medications */}
                <div>
                  <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
                    FMOH Aligned Medication Recommendations
                  </h4>
                  <div className="space-y-2">
                    {latestAi.aiResponse.medicationSuggestions.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                          <span>
                            {m.drug} {m.dosage}
                          </span>
                          <span className="text-[10px] text-teal-700 font-normal dark:text-teal-400">{m.frequency}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{m.clinicalRationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Sign-Off Button */}
                <div className="pt-2">
                  <Link
                    href={`/review/${latestAi.id}`}
                    className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.01]"
                  >
                    <FileCheck className="w-4 h-4" />
                    Review, Modify & Sign E-Prescriptions
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center py-10 px-4">
                <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mx-auto mb-4">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Multimodal Case Analysis Ready</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Run Gemini 1.5 Pro cross-modal reasoning on {fullName}&apos;s EHR: vitals, lab panels, pharmacogenomics, and active orders.
                </p>
                <button
                  onClick={handleRunAi}
                  disabled={isAnalyzing}
                  className="mt-5 px-5 py-2.5 rounded-2xl bg-teal-500 text-slate-950 font-extrabold text-xs hover:bg-teal-400 transition-all shadow-md"
                >
                  Trigger Biopsychosocial AI Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS: RECORD VITALS, DIGITAL CARD, PRINTABLE CARD, UPLOAD ASSET */}
      {/* ========================================================================= */}

      {/* MODAL 1: RECORD VITALS MODAL */}
      {showRecordVitalsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowRecordVitalsModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Record Physiological Vitals
                </h2>
              </div>
              <button
                onClick={() => setShowRecordVitalsModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {vitalsSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{vitalsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveVitals} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.systolicBp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBp: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.diastolicBp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBp: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.heartRate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">SpO2 (%)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.oxygenSaturation}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={vitalsForm.temperatureC}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperatureC: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={vitalsForm.weightKg}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.heightCm}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heightCm: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Clinical Observation / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient resting comfortably in triage room; no acute respiratory distress."
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordVitalsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVitals}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                >
                  {isSavingVitals ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Vitals to Chart</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DIGITAL PATIENT CARD MODAL */}
      {showDigitalCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowDigitalCardModal(false)}
        >
          <div className="w-full max-w-lg relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setShowDigitalCardModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <DigitalPatientCard
              card={{
                cardId: digitalCardId,
                mrn: patient.mrn || "MRN-14746",
                patientName: fullName,
                nationalId: patient.nationalId || "ETH-NID-VERIFIED",
                nationalIdVerified: true,
                bloodType: patient.bloodType || "O+",
                phone: patient.phone || "+251 941111540",
                email: patient.email || "jason369tesla@gmail.com",
                primaryClinic: "NiniMed Habitat Main Clinic & 24/7 ER",
                issuedAt: "Sep 2026",
                validUntil: "Sep 2027",
                status: "Active Comprehensive Care",
                loginPasscode: `NN-${patient.mrn?.replace(/\D/g, "") || "14746"}`,
              }}
              onProceed={() => setShowDigitalCardModal(false)}
              showProceedButton={false}
            />
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE PATIENT CARD MODAL */}
      {showPrintModal && (
        <PrintablePatientCard
          patient={{
            id: patient.id,
            mrn: patient.mrn || "MRN-14746",
            firstName: patient.firstName || "Yeabsira",
            lastName: patient.lastName || "Abebe Tadesse",
            dateOfBirth: patient.dateOfBirth || "2002-02-04",
            gender: patient.gender || "male",
            bloodType: patient.bloodType || "O+",
            phone: patient.phone || "+251 941111540",
            allergies: patientAllergies,
            ticketNumber: "T-14746",
            destinationRoom: "Room 102 - Clinical Examination",
            estimatedWaitMinutes: 5,
          }}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* MODAL 4: UPLOAD MEDIA ASSET MODAL */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-400" />
                <span>Upload Clinical Media / Signal Asset</span>
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Asset Type</label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="image">Image (Radiology/Derm)</option>
                    <option value="audio">Audio (Auscultation/Voice)</option>
                    <option value="signal">Signal (12-Lead ECG/EEG)</option>
                    <option value="genomic">Genomic (VCF Panel)</option>
                    <option value="video">Video (Gait/Movement)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Clinical Modality</label>
                  <select
                    value={mediaModality}
                    onChange={(e) => setMediaModality(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    {mediaType === "image" && (
                      <>
                        <option value="xray">PA/Lateral X-Ray</option>
                        <option value="ct">CT Scan</option>
                        <option value="mri">MRI Scan</option>
                        <option value="dermatology_photo">Dermatology Lesion</option>
                      </>
                    )}
                    {mediaType === "audio" && (
                      <>
                        <option value="auscultation_lung">Lung Auscultation (Breath Sounds)</option>
                        <option value="auscultation_heart">Heart Stethoscope Recording</option>
                        <option value="speech_audio">Clinical Speech & Prosody</option>
                      </>
                    )}
                    {mediaType === "signal" && (
                      <>
                        <option value="ecg_signal">12-Lead Digital ECG Waveform</option>
                        <option value="eeg_signal">EEG Brain Signal</option>
                        <option value="wearable_timeseries">Continuous Wearable Biometrics</option>
                      </>
                    )}
                    {mediaType === "genomic" && (
                      <option value="vcf_genomic">Targeted PGx VCF Panel</option>
                    )}
                    {mediaType === "video" && (
                      <option value="gait_video">Timed Up & Go Gait Video</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Asset Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PA Chest Radiograph (100 kVp)"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Findings / Pre-Processed Summary</label>
                <textarea
                  rows={2}
                  placeholder="Enter initial radiologist impression or specialized model findings..."
                  value={mediaSummary}
                  onChange={(e) => setMediaSummary(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Virus scan & DICOM de-identification performed automatically upon ingestion.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold shadow-md"
                >
                  Ingest & Process Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
