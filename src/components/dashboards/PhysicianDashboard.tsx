"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useClinic } from "../../context/ClinicContext";
import IncomingBookingPanel from "./IncomingBookingPanel";
import ClinicalOrderDropdown from "../clinical/ClinicalOrderDropdown";
import { checkClinicalSafety, DrugSafetyAlert } from "../../lib/safety/drug-checker";
import { soundAlerts } from "../../lib/audio/sound-alerts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Dna,
  Droplets,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Flame,
  HeartHandshake,
  HeartPulse,
  ListPlus,
  Microscope,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Patient, PrescriptionRecord, LabOrderRecord } from "../../lib/types/clinical";

// ──────────────────────────────────────────────────────────────
// INTENSIVE DIAGNOSTIC & PROCEDURAL CLINICAL CATALOG
// ──────────────────────────────────────────────────────────────
const COMMON_DIAGNOSTIC_PANELS = [
  // Chemistry & Metabolic
  { name: "Comprehensive Metabolic Panel (CMP)", category: "Chemistry", priority: "urgent" as const, reason: "Electrolyte imbalance, hepatic & renal assessment" },
  { name: "Basic Metabolic Panel (BMP)", category: "Chemistry", priority: "urgent" as const, reason: "Routine electrolyte & fluid balance check" },
  { name: "Magnesium (Mg)", category: "Chemistry", priority: "routine" as const, reason: "Evaluate arrhythmias or neuromuscular irritability" },
  { name: "Lactic Acid (Lactate), Plasma", category: "Chemistry", priority: "stat" as const, reason: "Sepsis protocol, tissue hypoperfusion marker" },
  { name: "Iron Panel (Iron, TIBC, Transferrin)", category: "Chemistry", priority: "routine" as const, reason: "Evaluate anemia etiology and iron storage" },
  
  // Cardiac
  { name: "High-Sensitivity Cardiac Troponin I", category: "Cardiac", priority: "stat" as const, reason: "Rule out acute coronary syndrome / myocardial necrosis" },
  { name: "B-Type Natriuretic Peptide (NT-proBNP)", category: "Cardiac", priority: "urgent" as const, reason: "Congestive heart failure exacerbation assessment" },
  { name: "Creatine Kinase-MB (CK-MB)", category: "Cardiac", priority: "stat" as const, reason: "Myocardial infarction evaluation" },
  { name: "Lipid Panel (Standard)", category: "Cardiac", priority: "routine" as const, reason: "Atherosclerotic cardiovascular disease (ASCVD) risk" },

  // Hematology & Coagulation
  { name: "Complete Blood Count with Diff (CBC)", category: "Hematology", priority: "urgent" as const, reason: "Evaluate leukocytosis, anemia & thrombocytopenia" },
  { name: "Prothrombin Time (PT/INR)", category: "Hematology", priority: "urgent" as const, reason: "Warfarin monitoring, liver synthetic function" },
  { name: "Partial Thromboplastin Time (aPTT)", category: "Hematology", priority: "urgent" as const, reason: "Heparin monitoring, intrinsic pathway evaluation" },
  { name: "D-Dimer, Quantitative", category: "Hematology", priority: "stat" as const, reason: "Rule out deep vein thrombosis (DVT) or pulmonary embolism (PE)" },
  { name: "Erythrocyte Sedimentation Rate (ESR)", category: "Hematology", priority: "routine" as const, reason: "Systemic inflammation and autoimmune workup" },

  // Renal & Urinalysis
  { name: "Renal Panel (eGFR, BUN, Creatinine)", category: "Renal", priority: "urgent" as const, reason: "Staging chronic kidney disease & drug clearance limits" },
  { name: "Urinalysis (UA) with Microscopy", category: "Renal", priority: "urgent" as const, reason: "Urinary tract infection, hematuria, or proteinuria screen" },
  { name: "Spot Urine Protein/Creatinine Ratio", category: "Renal", priority: "routine" as const, reason: "Quantify proteinuria in nephrotic syndrome/CKD" },

  // Hepatic & Pancreatic
  { name: "Hepatic Function Panel (LFTs)", category: "Hepatic", priority: "urgent" as const, reason: "Evaluate hepatocellular injury or biliary stasis" },
  { name: "Ammonia, Plasma", category: "Hepatic", priority: "stat" as const, reason: "Hepatic encephalopathy evaluation" },
  { name: "Lipase, Serum", category: "Hepatic", priority: "urgent" as const, reason: "Acute pancreatitis diagnosis" },

  // Pulmonary
  { name: "Arterial Blood Gas (ABG)", category: "Pulmonary", priority: "stat" as const, reason: "Assess hypoxemia, acid-base equilibrium & tissue perfusion" },
  { name: "Venous Blood Gas (VBG)", category: "Pulmonary", priority: "urgent" as const, reason: "Assess pCO2 and pH in non-hypoxic patients" },

  // Infectious Disease & Immunology
  { name: "Blood Culture (Aerobic & Anaerobic)", category: "Infectious", priority: "stat" as const, reason: "Sepsis protocol, suspected bacteremia" },
  { name: "Urine Culture & Susceptibility", category: "Infectious", priority: "routine" as const, reason: "Identify uropathogen and antibiotic sensitivities" },
  { name: "C-Reactive Protein (CRP), High Sensitivity", category: "Infectious", priority: "urgent" as const, reason: "Acute phase reactant for inflammation/infection" },
  { name: "Procalcitonin", category: "Infectious", priority: "urgent" as const, reason: "Differentiate bacterial vs viral respiratory infection" },
  { name: "Antinuclear Antibodies (ANA) IFA", category: "Immunology", priority: "routine" as const, reason: "Systemic autoimmune disease screen (SLE, Lupus)" },

  // Endocrinology
  { name: "Hemoglobin A1c (HbA1c)", category: "Endocrine", priority: "routine" as const, reason: "Glycemic optimization & microvascular risk stratification" },
  { name: "Thyroid Stimulating Hormone (TSH)", category: "Endocrine", priority: "routine" as const, reason: "Screening for hypo/hyperthyroidism" },
  { name: "Free T4 (Thyroxine)", category: "Endocrine", priority: "routine" as const, reason: "Confirm abnormal TSH findings" },
  { name: "Cortisol, AM", category: "Endocrine", priority: "routine" as const, reason: "Evaluate adrenal insufficiency or Cushing's" },

  // Toxicology
  { name: "Comprehensive Urine Drug Screen", category: "Toxicology", priority: "urgent" as const, reason: "Altered mental status, suspected ingestion/overdose" },
  { name: "Acetaminophen Level, Serum", category: "Toxicology", priority: "stat" as const, reason: "Rule out paracetamol toxicity" },
  { name: "Salicylate Level, Serum", category: "Toxicology", priority: "stat" as const, reason: "Evaluate aspirin overdose and acid-base derangement" },

  // Genetics & PGx
  { name: "CYP2C19 Pharmacogenomic Panel", category: "Genetics", priority: "routine" as const, reason: "Determine clopidogrel hepatic metabolism status" },
  { name: "CYP2D6 Pharmacogenomic Panel", category: "Genetics", priority: "routine" as const, reason: "Evaluate beta-blocker/opioid metabolic pathways" },
  { name: "HLA-B*1502 Genotyping", category: "Genetics", priority: "routine" as const, reason: "Risk of Stevens-Johnson syndrome with Carbamazepine" },

  // Imaging & Procedures
  { name: "Chest Radiograph (X-Ray PA & Lat)", category: "Imaging", priority: "urgent" as const, reason: "Investigate pulmonary congestion, infiltrate or cardiomegaly" },
  { name: "CT Head (Non-Contrast)", category: "Imaging", priority: "stat" as const, reason: "Rule out acute intracranial hemorrhage / stroke protocol" },
  { name: "CT Pulmonary Angiography (CTPA)", category: "Imaging", priority: "stat" as const, reason: "Evaluate for acute pulmonary embolism" },
  { name: "MRI Brain w/wo Contrast", category: "Imaging", priority: "routine" as const, reason: "Evaluate demyelinating disease, mass, or subacute stroke" },
  { name: "Ultrasound Abdomen Complete", category: "Imaging", priority: "urgent" as const, reason: "Evaluate biliary tree, hepatic parenchyma, and renal contours" },
  { name: "12-Lead Electrocardiogram (ECG)", category: "Cardiac", priority: "stat" as const, reason: "Evaluate ST-segment changes, QT prolongation & dysrhythmias" },
  { name: "Point-of-Care Echocardiography (POCUS)", category: "Imaging", priority: "urgent" as const, reason: "Assess left ventricular ejection fraction & wall motion" },
  { name: "eFAST Ultrasound Scan", category: "Imaging", priority: "stat" as const, reason: "Trauma protocol: evaluate free fluid in abdomen/thorax" },
];

// Rapid Formulary Shortcuts for Precision E-Prescribing
const FORMULARY_SHORTCUTS = [
  { name: "Ticagrelor (Brilinta)", dosage: "90 mg", route: "Oral", frequency: "BID (Twice Daily)", durationDays: 30, dispenseQuantity: 60, refills: 2, indication: "Secondary ACS prophylaxis (PGx CPIC Preferred)" },
  { name: "Empagliflozin (Jardiance)", dosage: "10 mg", route: "Oral", frequency: "Once Daily (Morning)", durationDays: 30, dispenseQuantity: 30, refills: 3, indication: "Cardiorenal protection & Type 2 Diabetes" },
  { name: "Metformin ER", dosage: "500 mg", route: "Oral", frequency: "Once Daily with Dinner", durationDays: 30, dispenseQuantity: 30, refills: 3, indication: "Glycemic management (eGFR capped at 1000mg/day if 30-44)" },
  { name: "Lisinopril", dosage: "20 mg", route: "Oral", frequency: "Once Daily", durationDays: 30, dispenseQuantity: 30, refills: 3, indication: "Essential hypertension & nephroprotection" },
  { name: "Atorvastatin (Lipitor)", dosage: "40 mg", route: "Oral", frequency: "Once Daily at Bedtime", durationDays: 30, dispenseQuantity: 30, refills: 3, indication: "High-intensity lipid lowering" },
  { name: "Pantoprazole (Protonix)", dosage: "40 mg", route: "Oral", frequency: "Once Daily before Breakfast", durationDays: 30, dispenseQuantity: 30, refills: 1, indication: "Gastroprotection (Minimal CYP2C19 inhibition)" },
  { name: "Amoxicillin-Clavulanate", dosage: "875/125 mg", route: "Oral", frequency: "BID (Twice Daily with meals)", durationDays: 7, dispenseQuantity: 14, refills: 0, indication: "Acute respiratory bacterial infection" },
  { name: "Clopidogrel (Plavix)", dosage: "75 mg", route: "Oral", frequency: "Once Daily", durationDays: 30, dispenseQuantity: 30, refills: 1, indication: "P2Y12 platelet inhibitor" },
];

interface PendingLabOrder {
  id: string;
  testName: string;
  category: string;
  priority: "routine" | "urgent" | "stat";
  reason: string;
}

export default function PhysicianDashboard() {
  const {
    patients,
    vitals,
    labResults,
    genetics,
    medications,
    prescriptions,
    labOrders,
    aiSuggestions,
    runAiAnalysis,
    reviewAiSuggestion,
    createPrescription,
    createLabOrder,
    isAnalyzing,
    currentUser,
  } = useClinic();

  // Navigation & View Mode State
  const [activeTab, setActiveTab] = useState<"triage" | "diagnostics" | "prescribing" | "ai_cds">("triage");
  const [searchQuery, setSearchQuery] = useState("");
  const [acuityFilter, setAcuityFilter] = useState<"all" | "critical" | "urgent" | "routine">("all");
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  // Shift Timer / Clock
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Standalone E-Prescribe Terminal State
  const [selectedRxPatientId, setSelectedRxPatientId] = useState<string>(patients[0]?.id || "");
  const [rxMedName, setRxMedName] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxRoute, setRxRoute] = useState("Oral");
  const [rxFrequency, setRxFrequency] = useState("Once Daily");
  const [rxDurationDays, setRxDurationDays] = useState<number>(30);
  const [rxQuantity, setRxQuantity] = useState<number>(30);
  const [rxRefills, setRxRefills] = useState<number>(1);
  const [rxIndication, setRxIndication] = useState("");
  const [rxSafetyAlerts, setRxSafetyAlerts] = useState<DrugSafetyAlert[]>([]);
  const [isSubmittingRx, setIsSubmittingRx] = useState(false);

  // Standalone Diagnostic Studio State (Multi-Order Cart System)
  const [selectedDiagPatientId, setSelectedDiagPatientId] = useState<string>(patients[0]?.id || "");
  const [diagCategoryFilter, setDiagCategoryFilter] = useState<string>("All");
  const [pendingDiagOrders, setPendingDiagOrders] = useState<PendingLabOrder[]>([]);
  const [customTestName, setCustomTestName] = useState("");
  const [customCategory, setCustomCategory] = useState("Chemistry");
  const [customPriority, setCustomPriority] = useState<"routine" | "urgent" | "stat">("urgent");
  const [customClinicalReason, setCustomClinicalReason] = useState("");
  const [isSubmittingDiag, setIsSubmittingDiag] = useState(false);
  const [diagResultFilter, setDiagResultFilter] = useState<"all" | "abnormal">("all");

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "warning" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Synchronize default selected patient for prescribing/diagnostics when patients array loads
  useEffect(() => {
    if (patients.length > 0) {
      if (!selectedRxPatientId || !patients.some((p) => p.id === selectedRxPatientId)) {
        setSelectedRxPatientId(patients[0].id);
      }
      if (!selectedDiagPatientId || !patients.some((p) => p.id === selectedDiagPatientId)) {
        setSelectedDiagPatientId(patients[0].id);
      }
    }
  }, [patients, selectedRxPatientId, selectedDiagPatientId]);

  // Real-time Clinical Safety & PGx Verification Engine
  useEffect(() => {
    const targetPatient = patients.find((p) => p.id === selectedRxPatientId);
    if (!targetPatient || !rxMedName.trim()) {
      setRxSafetyAlerts([]);
      return;
    }

    const alerts = checkClinicalSafety(
      rxMedName,
      medications.filter((m) => m.patientId === targetPatient.id),
      targetPatient.allergies || [],
      labResults.filter((l) => l.patientId === targetPatient.id),
      genetics.filter((g) => g.patientId === targetPatient.id)
    );
    setRxSafetyAlerts(alerts);
  }, [rxMedName, selectedRxPatientId, medications, labResults, genetics, patients]);

  // Telemetry Metric Calculations
  const metrics = useMemo(() => {
    const criticalCount = patients.filter((p) => p.triagePriority === "critical").length;
    const urgentCount = patients.filter((p) => p.triagePriority === "urgent").length;
    const routineCount = patients.filter((p) => p.triagePriority === "routine").length;
    const pendingReviewsCount = aiSuggestions.filter((s) => s.status === "pending_review").length;
    const abnormalLabsCount = labResults.filter((l) => l.isAbnormal).length;
    const activePrescriptionsCount = prescriptions.filter((r) => r.status === "signed").length;

    const pgxAlerts = genetics.filter((g) => g.gene.toUpperCase() === "CYP2C19" && g.variant.includes("*2")).length;
    const renalAlerts = labResults.filter(
      (l) => l.testName.toLowerCase().includes("egfr") && parseFloat(l.value) < 45
    ).length;

    return {
      totalPatients: patients.length,
      criticalCount,
      urgentCount,
      routineCount,
      pendingReviewsCount,
      abnormalLabsCount,
      activePrescriptionsCount,
      totalSafetyWatchdogs: pgxAlerts + renalAlerts,
    };
  }, [patients, aiSuggestions, labResults, prescriptions, genetics]);

  // Filtered Patient Queue
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.allergies.some((a) => a.substance.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAcuity =
        acuityFilter === "all" ||
        p.triagePriority === acuityFilter;

      return matchesSearch && matchesAcuity;
    });
  }, [patients, searchQuery, acuityFilter]);

  // Handle Prescription Submission
  const handleSignAndPrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatient = patients.find((p) => p.id === selectedRxPatientId);
    if (!targetPatient) {
      showToast("Please select a valid patient.", "error");
      return;
    }
    if (!rxMedName.trim()) {
      showToast("Medication name is required.", "error");
      return;
    }

    setIsSubmittingRx(true);
    try {
      await createPrescription({
        patientId: targetPatient.id,
        doctorId: currentUser?.id || "MD-782914-TX",
        doctorName: currentUser?.fullName || "Dr. Sarah Mitchell, MD",
        medicationName: rxMedName,
        dosage: rxDosage || "Standard",
        frequency: rxFrequency,
        route: rxRoute,
        durationDays: rxDurationDays,
        dispenseQuantity: rxQuantity,
        refills: rxRefills,
        indication: rxIndication || "Clinician prescription",
      });

      soundAlerts.playBookingAlertBeep();
      showToast(`e-Prescription signed & dispatched: ${rxMedName} (${rxDosage}) for ${targetPatient.firstName} ${targetPatient.lastName}`, "success");
      setRxMedName("");
      setRxDosage("");
      setRxIndication("");
      setRxSafetyAlerts([]);
    } catch {
      showToast("Failed to transmit prescription. Please verify system connection.", "error");
    } finally {
      setIsSubmittingRx(false);
    }
  };

  // Helper to load formulary shortcut
  const applyFormularyShortcut = (med: typeof FORMULARY_SHORTCUTS[0]) => {
    setRxMedName(med.name);
    setRxDosage(med.dosage);
    setRxRoute(med.route);
    setRxFrequency(med.frequency);
    setRxDurationDays(med.durationDays);
    setRxQuantity(med.dispenseQuantity);
    setRxRefills(med.refills);
    setRxIndication(med.indication);
  };

  // Diagnostic Cart Functions
  const addDiagnosticPanelToOrder = (panel: typeof COMMON_DIAGNOSTIC_PANELS[0]) => {
    if (pendingDiagOrders.some((o) => o.testName === panel.name)) {
      showToast(`${panel.name} is already in the order queue.`, "warning");
      return;
    }
    setPendingDiagOrders((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random(),
        testName: panel.name,
        category: panel.category,
        priority: panel.priority,
        reason: panel.reason,
      },
    ]);
  };

  const addCustomTestToOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTestName.trim()) {
      showToast("Test or procedure name is required.", "warning");
      return;
    }
    setPendingDiagOrders((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random(),
        testName: customTestName,
        category: customCategory,
        priority: customPriority,
        reason: customClinicalReason || "Clinical requirement",
      },
    ]);
    setCustomTestName("");
    setCustomClinicalReason("");
  };

  const removeDiagnosticOrder = (id: string) => {
    setPendingDiagOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // Handle Diagnostic Multi-Order Submission
  const handleAuthorizeDiagnosticOrders = async () => {
    const targetPatient = patients.find((p) => p.id === selectedDiagPatientId);
    if (!targetPatient) {
      showToast("Please select a valid patient.", "error");
      return;
    }
    if (pendingDiagOrders.length === 0) {
      showToast("Add at least one test or procedure to dispatch.", "warning");
      return;
    }

    setIsSubmittingDiag(true);
    try {
      await Promise.all(
        pendingDiagOrders.map((order) =>
          createLabOrder({
            patientId: targetPatient.id,
            doctorId: currentUser?.id || "MD-782914-TX",
            doctorName: currentUser?.fullName || "Dr. Sarah Mitchell, MD",
            testName: order.testName,
            category: order.category,
            priority: order.priority,
            clinicalReason: order.reason,
          })
        )
      );

      soundAlerts.playBookingAlertBeep();
      showToast(`Dispatched ${pendingDiagOrders.length} diagnostic orders for ${targetPatient.firstName} ${targetPatient.lastName}`, "success");
      setPendingDiagOrders([]);
    } catch {
      showToast("Failed to dispatch diagnostic orders. Please check connection.", "error");
    } finally {
      setIsSubmittingDiag(false);
    }
  };

  const uniqueDiagCategories = useMemo(() => {
    const cats = new Set(COMMON_DIAGNOSTIC_PANELS.map((p) => p.category));
    return ["All", ...Array.from(cats)];
  }, []);

  const filteredDiagnosticPanels = useMemo(() => {
    if (diagCategoryFilter === "All") return COMMON_DIAGNOSTIC_PANELS;
    return COMMON_DIAGNOSTIC_PANELS.filter((p) => p.category === diagCategoryFilter);
  }, [diagCategoryFilter]);

  return (
    <div className="space-y-5 animate-fade-in pb-16 px-1">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all animate-slide-in-right ${
            toast.type === "success"
              ? "bg-slate-900/95 border-teal-500/50 text-teal-200"
              : toast.type === "warning"
              ? "bg-slate-900/95 border-amber-500/50 text-amber-200"
              : "bg-slate-900/95 border-rose-500/50 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          ) : toast.type === "warning" ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. COMMAND & CONTROL HEADER (Luminous Physician Console)     */}
      {/* ============================================================ */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.09),transparent_32%),radial-gradient(circle_at_right,rgba(191,219,254,0.15),transparent_28%)]" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-teal-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Physician Clinical Workstation
              </span>
              <span className="text-xs text-slate-600 font-mono bg-white/70 px-2.5 py-0.5 rounded-lg border border-slate-200">
                License: <span className="text-teal-700 font-semibold">{currentUser?.licenseNumber || "MD-782914-TX"}</span>
              </span>
              <span className="text-xs text-slate-600 font-mono bg-white/70 px-2.5 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Shift Time: <strong className="text-slate-800">{currentTime || "Active"}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight flex items-center gap-2.5">
              Clinical Triage, Diagnostics & E-Prescribing
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Attending Clinician: <strong className="text-slate-900">{currentUser?.fullName || "Dr. Sarah Mitchell, MD"}</strong> •{" "}
              {currentUser?.specialty || "Internal Medicine & Acute Care"} •{" "}
              <span className="text-emerald-700">21 CFR Part 11 Electronic Prescriptions & Gemini 1.5 Pro Multimodal CDS</span>.
            </p>
          </div>

          {/* Header Action Deck */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => {
                setActiveTab("prescribing");
                if (patients.length > 0) setSelectedRxPatientId(patients[0].id);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-900/40 active:scale-95"
            >
              <Pill className="w-4 h-4" />
              Quick e-Rx
            </button>

            <button
              onClick={() => {
                setActiveTab("diagnostics");
                if (patients.length > 0) setSelectedDiagPatientId(patients[0].id);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Microscope className="w-4 h-4 text-teal-400" />
              STAT Diagnostics
            </button>

            <Link
              href="/appointments"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Calendar className="w-4 h-4 text-teal-400" />
              Schedule
            </Link>

            <Link
              href="/patients"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Users className="w-4 h-4 text-teal-400" />
              Directory
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. REAL-TIME CLINICAL KPI TELEMETRY BAR (5 DYNAMIC METRICS)  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Triage Acuity Cohort */}
        <div className="soft-panel p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Triage Cohort</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics.totalPatients}</span>
            <span className="text-[11px] text-rose-500 font-bold flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              {metrics.criticalCount + metrics.urgentCount} High Acuity
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${metrics.totalPatients > 0 ? (metrics.criticalCount / metrics.totalPatients) * 100 : 0}%` }}
              title={`Critical: ${metrics.criticalCount}`}
            />
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${metrics.totalPatients > 0 ? (metrics.urgentCount / metrics.totalPatients) * 100 : 0}%` }}
              title={`Urgent: ${metrics.urgentCount}`}
            />
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${metrics.totalPatients > 0 ? (metrics.routineCount / metrics.totalPatients) * 100 : 0}%` }}
              title={`Routine: ${metrics.routineCount}`}
            />
          </div>
        </div>

        {/* Diagnostic Labs & Orders */}
        <div className="soft-panel p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Diagnostic Orders</span>
            <Microscope className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{labOrders.length}</span>
            <span className="text-[11px] text-cyan-600 font-semibold">Active Workups</span>
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            {metrics.abnormalLabsCount} Abnormal Findings Flagged
          </p>
        </div>

        {/* Active Precision e-Prescriptions */}
        <div className="soft-panel p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Regimens (e-Rx)</span>
            <Pill className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{metrics.activePrescriptionsCount}</span>
            <span className="text-[11px] text-slate-600">Signed Regimens</span>
          </div>
          <p className="text-[10px] text-emerald-700/80 truncate">
            21 CFR Part 11 Authenticated
          </p>
        </div>

        {/* Precision PGx & DDI Watchdog */}
        <div className="soft-panel p-4 rounded-2xl space-y-2 border border-rose-100 bg-rose-50/80">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">PGx & DDI Watchdog</span>
            <Dna className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{metrics.totalSafetyWatchdogs}</span>
            <span className="text-[11px] text-rose-600 font-bold">Active Contraindications</span>
          </div>
          <p className="text-[10px] text-rose-600/80 truncate">
            CYP2C19 *2/*2 & Renal Caps Active
          </p>
        </div>

        {/* Pending AI CDS Sign-Offs */}
        <div className="soft-panel p-4 rounded-2xl space-y-2 border border-teal-100 bg-teal-50/80 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">AI Reviews (CDS)</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700">{metrics.pendingReviewsCount}</span>
            <span className="text-[11px] text-teal-700 font-semibold">Awaiting Review</span>
          </div>
          <p className="text-[10px] text-teal-700/80 truncate">
            Gemini 1.5 Pro Multimodal
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. INTERACTIVE WORKSPACE VIEW MODES & TAB SWITCHER           */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl soft-panel text-xs">
          <button
            onClick={() => setActiveTab("triage")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === "triage"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Clinical Triage & Queue</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "triage" ? "bg-slate-950 text-teal-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {filteredPatients.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === "diagnostics"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Microscope className="w-4 h-4" />
            <span>Diagnostic Studio</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "diagnostics" ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {labOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("prescribing")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === "prescribing"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Precision E-Prescribing (e-Rx)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "prescribing" ? "bg-slate-950 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {prescriptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ai_cds")}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === "ai_cds"
                ? "bg-violet-500 text-slate-950 shadow-md shadow-violet-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>AI CDS & Part 11 Reviews</span>
            {metrics.pendingReviewsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold animate-pulse">
                {metrics.pendingReviewsCount}
              </span>
            )}
          </button>
        </div>

        {/* Global Patient Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, MRN, allergy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. TAB 1: CLINICAL TRIAGE & ENCOUNTER QUEUE                 */}
      {/* ============================================================ */}
      {activeTab === "triage" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Patient Encounter List & Live Vitals */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-4 bg-slate-900/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-400" />
                    Active Patient Triage & Clinical Encounters ({filteredPatients.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Continuous hemodynamic telemetry, allergies & emergency priority routing
                  </p>
                </div>

                {/* Acuity Filter Chips */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setAcuityFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      acuityFilter === "all" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAcuityFilter("critical")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      acuityFilter === "critical"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "text-slate-400"
                    }`}
                  >
                    Critical ({metrics.criticalCount})
                  </button>
                  <button
                    onClick={() => setAcuityFilter("urgent")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      acuityFilter === "urgent"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "text-slate-400"
                    }`}
                  >
                    Urgent ({metrics.urgentCount})
                  </button>
                  <button
                    onClick={() => setAcuityFilter("routine")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      acuityFilter === "routine"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400"
                    }`}
                  >
                    Routine ({metrics.routineCount})
                  </button>
                </div>
              </div>

              {/* Patient Cards */}
              <div className="space-y-3">
                {filteredPatients.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                    No patients match your search criteria. Try clearing filters.
                  </div>
                ) : (
                  filteredPatients.map((p) => {
                    const patVitals = vitals.find((v) => v.patientId === p.id);
                    const patLabs = labResults.filter((l) => l.patientId === p.id);
                    const patMeds = medications.filter((m) => m.patientId === p.id);
                    const patGen = genetics.filter((g) => g.patientId === p.id);
                    const egfr = patLabs.find((l) => l.testName.toLowerCase().includes("egfr"));
                    const isExpanded = expandedPatientId === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border transition-all ${
                          p.triagePriority === "critical"
                            ? "bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-900 border-rose-500/40 hover:border-rose-500"
                            : p.triagePriority === "urgent"
                            ? "bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/30 hover:border-amber-500"
                            : "bg-slate-900/90 border-slate-800 hover:border-teal-500/40"
                        }`}
                      >
                        <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          {/* Patient Avatar & Demographic Info */}
                          <div className="flex items-start sm:items-center gap-3.5">
                            <img
                              src={p.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"}
                              alt={p.firstName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md shrink-0"
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-white hover:text-teal-300 transition-colors">
                                  {p.firstName} {p.lastName}
                                </h4>
                                <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-500/30">
                                  {p.mrn}
                                </span>

                                {/* Priority Badge with Live Triage Status Indicator */}
                                <span
                                  className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    p.triagePriority === "critical"
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                                      : p.triagePriority === "urgent"
                                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      p.triagePriority === "critical"
                                        ? "bg-rose-400"
                                        : p.triagePriority === "urgent"
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                    }`}
                                  />
                                  {p.triagePriority}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>{p.age} yrs • {p.gender.toUpperCase()} • Blood: {p.bloodType}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-rose-300 font-medium">
                                  Allergies:{" "}
                                  {p.allergies.length > 0 ? (
                                    p.allergies.map((a) => `${a.substance} (${a.severity})`).join(", ")
                                  ) : (
                                    <span className="text-slate-400">NKDA</span>
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end">
                            {/* Run AI Button */}
                            <button
                              onClick={() => runAiAnalysis(p.id)}
                              disabled={isAnalyzing}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              title="Trigger Gemini 1.5 Pro multimodal synthesis"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                              <span className="hidden sm:inline">Run AI</span>
                            </button>

                            {/* Direct E-Prescribing Shortcut */}
                            <button
                              onClick={() => {
                                setSelectedRxPatientId(p.id);
                                setActiveTab("prescribing");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              title="Open E-Prescribing Terminal for this patient"
                            >
                              <Pill className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Rx</span>
                            </button>

                            {/* Direct Diagnostic Order Shortcut */}
                            <button
                              onClick={() => {
                                setSelectedDiagPatientId(p.id);
                                setActiveTab("diagnostics");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              title="Order diagnostic laboratory or imaging tests"
                            >
                              <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="hidden sm:inline">Lab</span>
                            </button>

                            {/* Hospital System Referral / Clinical Order Dropdown */}
                            <ClinicalOrderDropdown
                              patient={{
                                id: p.id,
                                firstName: p.firstName,
                                lastName: p.lastName,
                                mrn: p.mrn,
                                age: p.age,
                                gender: p.gender,
                              }}
                              compact={true}
                              buttonLabel="Order"
                            />

                            {/* Full Chart Link */}
                            <Link
                              href={`/patients/${p.id}`}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-all border border-slate-700 active:scale-95"
                            >
                              <span>Chart</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </Link>

                            {/* Accordion Toggle */}
                            <button
                              onClick={() => setExpandedPatientId(isExpanded ? null : p.id)}
                              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                              title={isExpanded ? "Collapse preview" : "Expand quick glance"}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Quick Vitals Pill Strip */}
                        <div className="px-4 pb-3 pt-1 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Vitals:</span>

                          {patVitals ? (
                            <>
                              <span
                                className={`px-2 py-0.5 rounded-lg border font-mono ${
                                  patVitals.systolicBp >= 140 || patVitals.diastolicBp >= 90
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                BP: {patVitals.systolicBp}/{patVitals.diastolicBp} mmHg
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded-lg border font-mono ${
                                  patVitals.heartRate > 100 || patVitals.heartRate < 50
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                HR: {patVitals.heartRate} bpm
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded-lg border font-mono ${
                                  patVitals.oxygenSaturation < 95
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                SpO2: {patVitals.oxygenSaturation}%
                              </span>

                              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                                Temp: {patVitals.temperatureC}°C
                              </span>

                              {egfr && (
                                <span
                                  className={`px-2 py-0.5 rounded-lg border font-mono ${
                                    parseFloat(egfr.value) < 45
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold"
                                      : "bg-slate-800 text-teal-300 border-slate-700"
                                  }`}
                                >
                                  eGFR: {egfr.value} mL/min
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No telemetry vitals recorded yet.</span>
                          )}
                        </div>

                        {/* Collapsible Clinical Quick Glance */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3 animate-fade-in text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Active Meds */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Pill className="w-3.5 h-3.5" /> Active Medications ({patMeds.length})
                                </span>
                                {patMeds.length === 0 ? (
                                  <p className="text-[11px] text-slate-500">No active medications.</p>
                                ) : (
                                  patMeds.slice(0, 3).map((m) => (
                                    <div key={m.id} className="text-[11px] text-slate-300">
                                      • <strong className="text-white">{m.name}</strong> {m.dosage} ({m.frequency})
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Recent Labs */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Microscope className="w-3.5 h-3.5" /> Recent Lab Results
                                </span>
                                {patLabs.length === 0 ? (
                                  <p className="text-[11px] text-slate-500">No recent laboratory tests.</p>
                                ) : (
                                  patLabs.slice(0, 3).map((l) => (
                                    <div key={l.id} className="text-[11px] flex justify-between">
                                      <span className="text-slate-300 truncate w-3/4" title={l.testName}>{l.testName}:</span>
                                      <span className={l.isAbnormal ? "text-rose-400 font-bold" : "text-slate-200"}>
                                        {l.value} {l.unit}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Pharmacogenomics */}
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Dna className="w-3.5 h-3.5" /> Genomic Biomarkers
                                </span>
                                {patGen.length === 0 ? (
                                  <p className="text-[11px] text-slate-500">No PGx profiles logged.</p>
                                ) : (
                                  patGen.map((g) => (
                                    <div key={g.id} className="text-[11px] text-slate-300">
                                      • {g.gene}: <strong className="text-purple-300">{g.variant}</strong> ({g.phenotype || "Metabolizer status"})
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Live Scheduled Telehealth & Part 11 AI Reviews */}
          <div className="lg:col-span-4 space-y-4">
            <IncomingBookingPanel clinicianId={currentUser?.id || ""} />

            {/* Real-time PGx & Drug Contraindication Watchdog Widget */}
            <div className="glass-card p-5 rounded-3xl border border-rose-500/30 bg-slate-900/90 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Clinical Decision Safety Watchdog
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  Live Screening
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous surveillance for pharmacogenomic mismatch, renal dosing limits, and dangerous drug-drug pairs.
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    CYP2C19 *2/*2 Poor Metabolizer Flag
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Clopidogrel (Plavix) is strictly contraindicated in loss-of-function variants. Ticagrelor (Brilinta) 90mg BID is recommended.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <Droplets className="w-4 h-4 text-amber-400 shrink-0" />
                    Renal Clearance (eGFR &lt; 45) Alert
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Metformin maximum safe dosage capped at 1000 mg/day. SGLT2i Empagliflozin approved for cardiorenal protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. TAB 2: DIAGNOSTIC STUDIO & MULTI-ORDER QUEUE              */}
      {/* ============================================================ */}
      {activeTab === "diagnostics" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
          {/* Left 7 Cols: Interactive Diagnostic Catalog & Order Terminal */}
          <div className="xl:col-span-7 space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 bg-slate-900/90 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-cyan-400" />
                    Comprehensive Diagnostic Catalog
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Queue multiple lab, imaging, and procedural orders for batch dispatch
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase hidden sm:block">
                  HL7 / LIS Connected
                </span>
              </div>

              {/* Patient Selection Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Target Patient Encounter</label>
                <select
                  value={selectedDiagPatientId}
                  onChange={(e) => setSelectedDiagPatientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — MRN: {p.mrn} ({p.gender.toUpperCase()}, {p.age}y, Triage: {p.triagePriority.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Browse Intensive Catalog */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <ListPlus className="w-4 h-4 text-cyan-400" /> Browse & Add Tests
                  </label>
                  {/* Category Filter for Catalog */}
                  <select
                    value={diagCategoryFilter}
                    onChange={(e) => setDiagCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    {uniqueDiagCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredDiagnosticPanels.map((panel) => (
                    <div
                      key={panel.name}
                      className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/50 flex flex-col justify-between gap-1.5 transition-all hover:border-cyan-500/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-semibold leading-snug text-slate-200">{panel.name}</span>
                        <button
                          type="button"
                          onClick={() => addDiagnosticPanelToOrder(panel)}
                          className="w-6 h-6 shrink-0 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 flex items-center justify-center text-cyan-300 transition-colors"
                          title="Add to Order Queue"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span
                          className={`uppercase font-bold px-1.5 py-0.5 rounded ${
                            panel.priority === "stat"
                              ? "bg-rose-500/20 text-rose-300"
                              : panel.priority === "urgent"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {panel.priority}
                        </span>
                        <span className="text-slate-500 truncate" title={panel.reason}>{panel.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Additional Test Form */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <label className="text-xs font-bold text-slate-300">Add Custom Test or Procedure</label>
                <form onSubmit={addCustomTestToOrder} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={customTestName}
                      onChange={(e) => setCustomTestName(e.target.value)}
                      placeholder="e.g. Factor V Leiden Mutation"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {uniqueDiagCategories.filter(c => c !== "All").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other / Custom</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={customPriority}
                      onChange={(e) => setCustomPriority(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-[10px] sm:text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={!customTestName.trim()}
                      className="w-full h-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Pending Order Queue & Dispatch */}
          <div className="xl:col-span-5 space-y-4">
            <div className="glass-card p-5 rounded-3xl border border-cyan-500/40 bg-slate-900/95 shadow-xl flex flex-col h-full min-h-[400px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-cyan-400" />
                  Order Queue ({pendingDiagOrders.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {pendingDiagOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-12">
                    <Microscope className="w-8 h-8 opacity-20" />
                    <p className="text-xs">No tests queued for dispatch.</p>
                  </div>
                ) : (
                  pendingDiagOrders.map((order) => (
                    <div key={order.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 group">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{order.testName}</span>
                          <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            order.priority === "stat" ? "bg-rose-500/20 text-rose-300" :
                            order.priority === "urgent" ? "bg-amber-500/20 text-amber-300" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            {order.priority}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{order.category} • {order.reason}</p>
                      </div>
                      <button
                        onClick={() => removeDiagnosticOrder(order.id)}
                        className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 mt-auto">
                <button
                  onClick={handleAuthorizeDiagnosticOrders}
                  disabled={pendingDiagOrders.length === 0 || isSubmittingDiag}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmittingDiag ? "Transmitting to LIS..." : `Authorize & Dispatch (${pendingDiagOrders.length}) Orders`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TAB 3: PRECISION E-PRESCRIBING TERMINAL (e-Rx)             */}
      {/* ============================================================ */}
      {activeTab === "prescribing" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left 7 Cols: Precision E-Prescribing Studio */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 bg-slate-900/90 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-400" />
                    Precision E-Prescribing Terminal (21 CFR Part 11)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Real-time allergy screening, renal clearance safeguards, and CPIC pharmacogenomic guidance
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase hidden sm:block">
                  DEA EPCS Certified
                </span>
              </div>

              {/* Patient Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Target Patient</label>
                <select
                  value={selectedRxPatientId}
                  onChange={(e) => setSelectedRxPatientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — MRN: {p.mrn} (Allergies:{" "}
                      {p.allergies.map((a) => a.substance).join(", ") || "NKDA"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Formulary Quick Shortcuts */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Standard Clinical Formulary (Rapid Prescribe)</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Click to auto-populate</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FORMULARY_SHORTCUTS.slice(0, 8).map((med) => (
                    <button
                      key={med.name}
                      type="button"
                      onClick={() => applyFormularyShortcut(med)}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                        rxMedName === med.name
                          ? "bg-emerald-500/20 border-emerald-500 text-white font-bold"
                          : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:border-emerald-500/40 hover:text-white"
                      }`}
                    >
                      <span className="text-[11px] font-bold truncate">{med.name}</span>
                      <span className="text-[10px] text-slate-400">{med.dosage}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE SAFETY CONTRAINDICATION SCREENER BANNER */}
              {rxMedName.trim() && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  {rxSafetyAlerts.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <strong>Safety Screening Cleared:</strong> Zero documented allergies, severe drug interactions,
                        or PGx contraindications detected for '{rxMedName}'.
                      </div>
                    </div>
                  ) : (
                    rxSafetyAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                          alert.severity === "Critical"
                            ? "bg-rose-950/80 border-rose-600 text-rose-200"
                            : "bg-amber-950/80 border-amber-600 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-white">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{alert.title}</span>
                          <span className="ml-auto text-[10px] uppercase px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/40 font-mono">
                            {alert.severity} Risk
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200 leading-relaxed">{alert.description}</p>
                        <div className="pt-1 text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5" />
                          Clinical Directive: {alert.recommendation}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Prescription Form */}
              <form onSubmit={handleSignAndPrescribe} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Medication Name</label>
                    <input
                      type="text"
                      value={rxMedName}
                      onChange={(e) => setRxMedName(e.target.value)}
                      placeholder="e.g. Ticagrelor"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Dosage / Strength</label>
                    <input
                      type="text"
                      value={rxDosage}
                      onChange={(e) => setRxDosage(e.target.value)}
                      placeholder="e.g. 90 mg"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Route of Admin</label>
                    <select
                      value={rxRoute}
                      onChange={(e) => setRxRoute(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Oral">Oral (PO)</option>
                      <option value="Sublingual">Sublingual (SL)</option>
                      <option value="Intravenous">Intravenous (IV)</option>
                      <option value="Subcutaneous">Subcutaneous (SubQ)</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Topical">Topical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Frequency</label>
                    <input
                      type="text"
                      value={rxFrequency}
                      onChange={(e) => setRxFrequency(e.target.value)}
                      placeholder="e.g. BID"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={rxDurationDays}
                      onChange={(e) => setRxDurationDays(parseInt(e.target.value) || 30)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Dispense Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={rxQuantity}
                      onChange={(e) => setRxQuantity(parseInt(e.target.value) || 30)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Refills Allowed</label>
                    <input
                      type="number"
                      min={0}
                      value={rxRefills}
                      onChange={(e) => setRxRefills(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Indication / Special Patient Instructions</label>
                  <input
                    type="text"
                    value={rxIndication}
                    onChange={(e) => setRxIndication(e.target.value)}
                    placeholder="e.g. Take with full glass of water. Report any unexplained bleeding."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Prescriber Signature: <strong className="text-white">DIGISIG-{currentUser?.id || "MD-782914-TX"}</strong>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRx}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950 active:scale-95 disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    {isSubmittingRx ? "Signing & Dispatching..." : "21 CFR Part 11 Sign & Transmit"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right 5 Cols: Active E-Prescriptions Registry */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/90 shadow-xl min-h-[400px]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  Active E-Prescriptions Registry ({prescriptions.length})
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold hidden sm:block">
                  Live Dispatch
                </span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {prescriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 space-y-2 py-12">
                    <Pill className="w-8 h-8 opacity-20" />
                    <p className="text-xs">No prescriptions transmitted yet.</p>
                  </div>
                ) : (
                  prescriptions.map((rx) => {
                    const pat = patients.find((p) => p.id === rx.patientId);
                    return (
                      <div
                        key={rx.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 transition-all text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-white text-xs truncate pr-2">
                            {rx.medicationName} <span className="text-emerald-400 font-normal">({rx.dosage})</span>
                          </h4>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase shrink-0">
                            {rx.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 truncate">
                          {rx.frequency} • {rx.route} • Qty: {rx.dispenseQuantity} • Refills: {rx.refills}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span className="truncate pr-2">Patient: <strong className="text-white">{pat ? `${pat.firstName} ${pat.lastName}` : "Cohort Record"}</strong></span>
                          <span className="font-mono text-emerald-400/80 shrink-0">Sig: {rx.prescriberSignature?.slice(0, 12)}...</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. TAB 4: MULTIMODAL AI CDS & 21 CFR PART 11 REVIEWS          */}
      {/* ============================================================ */}
      {activeTab === "ai_cds" && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-6 rounded-3xl border border-teal-500/30 bg-slate-900/90 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4 text-teal-400" />
                  Gemini 1.5 Pro Multimodal Clinical Decision Support (CDS) Reviews
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  21 CFR Part 11 compliant physician review, modification, and electronic endorsement queue
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold whitespace-nowrap">
                {metrics.pendingReviewsCount} Pending Signatures
              </span>
            </div>

            {aiSuggestions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Sparkles className="w-8 h-8 text-teal-400 mx-auto animate-pulse" />
                <p className="text-xs text-slate-300 font-bold">No AI evaluations generated yet.</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click 'Run AI' on any patient in the Triage Queue to initiate a comprehensive biopsychosocial assessment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {aiSuggestions.map((rev) => {
                  const pat = patients.find((p) => p.id === rev.patientId);
                  const isPending = rev.status === "pending_review";

                  return (
                    <div
                      key={rev.id}
                      className={`p-5 rounded-3xl border space-y-3 transition-all ${
                        isPending
                          ? "bg-slate-950 border-teal-500/40 shadow-lg shadow-teal-950/20"
                          : "bg-slate-950/60 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">
                            {pat ? `${pat.firstName} ${pat.lastName}` : "Patient"}
                          </span>
                          <span className="text-[10px] font-mono text-teal-400">({pat?.mrn || "MRN"})</span>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            isPending
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {rev.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
                        <strong className="text-teal-300 block mb-1">Gemini AI Synthesis:</strong>
                        <p className="line-clamp-3 text-[11px]">{rev.aiResponse?.patientSummaryInsight || "Comprehensive multi-domain clinical analysis completed."}</p>
                      </div>

                      {/* Differential Diagnoses Preview */}
                      {rev.aiResponse?.differentialDiagnoses && rev.aiResponse.differentialDiagnoses.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Differential Diagnoses:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {rev.aiResponse.differentialDiagnoses.slice(0, 3).map((d: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[10px] border border-slate-700"
                              >
                                {d.condition} ({Math.round(d.confidence * 100)}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Links */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                        <Link
                          href={`/review/${rev.id}`}
                          className="w-full sm:flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          <FileCheck className="w-4 h-4" />
                          Full 21 CFR Part 11 Review & Sign
                        </Link>

                        {isPending && (
                          <button
                            onClick={() => {
                              reviewAiSuggestion(rev.id, "accepted_full", "Direct physician endorsement");
                              soundAlerts.playBookingAlertBeep();
                              showToast(`Approved AI recommendation for ${pat?.firstName} ${pat?.lastName}`, "success");
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center"
                            title="Quick Endorse Full AI Plan"
                          >
                            <Check className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Approve</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
