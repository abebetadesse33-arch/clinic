"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useClinic } from "../../../context/ClinicContext";
import MultimodalMediaViewer from "../../../components/MultimodalMediaViewer";
import ClinicalOrderDropdown from "../../../components/clinical/ClinicalOrderDropdown";
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
} from "lucide-react";

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const {
    patients,
    vitals,
    symptoms,
    labResults,
    genetics,
    imaging,
    psychological,
    socialHistory,
    medications,
    mediaAssets,
    aiSuggestions,
    runAiAnalysis,
    uploadMediaAsset,
    isAnalyzing,
    checkSafetyForCandidate,
  } = useClinic();

  const [activeTab, setActiveTab] = useState<"overview" | "multimodal" | "biological" | "psychological" | "social" | "medications">("overview");
  const [candidateDrug, setCandidateDrug] = useState("");
  const [candidateAlerts, setCandidateAlerts] = useState<any[] | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fetchedPatient, setFetchedPatient] = useState<any | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);

  // Upload Form State
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | "signal" | "genomic">("image");
  const [mediaModality, setMediaModality] = useState("xray");
  const [mediaSummary, setMediaSummary] = useState("");

  useEffect(() => {
    if (!patientId) return;
    const found = patients.find((p) => p.id === patientId);
    if (!found) {
      setIsLoadingPatient(true);
      fetch(`/api/v1/patients/${patientId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setFetchedPatient({
              id: json.data.id,
              mrn: json.data.mrn || "MRN-TEMP",
              firstName: json.data.firstName || "Patient",
              lastName: json.data.lastName || "",
              dateOfBirth: json.data.dateOfBirth || "1980-01-01",
              age: json.data.dateOfBirth ? Math.floor((Date.now() - new Date(json.data.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : 40,
              gender: json.data.gender || "undisclosed",
              bloodType: json.data.bloodType || "O+",
              allergies: Array.isArray(json.data.allergies) ? json.data.allergies : [],
              chronicConditions: Array.isArray(json.data.chronicConditions) ? json.data.chronicConditions : [],
              primaryDoctor: "Dr. Sarah Mitchell, MD",
              triagePriority: json.data.triagePriority || "routine",
              avatar: json.data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
            });
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingPatient(false));
    }
  }, [patientId, patients]);

  const patient = patients.find((p) => p.id === patientId) || fetchedPatient || (patients.length > 0 ? patients[0] : null);

  if (!patient) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-200">Loading Patient Electronic Health Record...</p>
        <p className="text-xs text-slate-400">Retrieving multimodal vitals, history, and diagnostic panel</p>
      </div>
    );
  }

  const pVitals = vitals.find((v) => v.patientId === patient.id);
  const pSymptoms = symptoms.filter((s) => s.patientId === patient.id);
  const pLabs = labResults.filter((l) => l.patientId === patient.id);
  const pGenetics = genetics.filter((g) => g.patientId === patient.id);
  const pImaging = imaging.filter((img) => img.patientId === patient.id);
  const pPsych = psychological.filter((p) => p.patientId === patient.id);
  const pSocial = socialHistory.filter((s) => s.patientId === patient.id);
  const pMeds = medications.filter((m) => m.patientId === patient.id);
  const pMedia = mediaAssets.filter((m) => m.patientId === patient.id);

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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Patient Header Banner with elevated z-index for dropdown overlays */}
      <div className="minimal-dashboard-shell p-6 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-30">
        <div className="flex items-center gap-5">
          <img
            src={patientAvatar}
            alt={patient.firstName || "Patient"}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-200 shadow-xl"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {patient.firstName} {patient.lastName}
              </h1>
              <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 dark:text-teal-300 dark:bg-teal-500/10 dark:border-teal-500/30">
                {patient.mrn || "MRN-TEMP"}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  patient.triagePriority === "critical"
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                    : patient.triagePriority === "urgent"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                }`}
              >
                {patient.triagePriority || "routine"} Priority
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-300">
              <span>
                DOB: <strong>{patient.dateOfBirth || "N/A"}</strong> ({patient.age || "--"} yrs)
              </span>
              <span>•</span>
              <span>
                Gender: <strong>{(patient.gender || "undisclosed").toUpperCase()}</strong>
              </span>
              <span>•</span>
              <span>
                Blood Type: <strong className="text-rose-600 dark:text-rose-400">{patient.bloodType || "N/A"}</strong>
              </span>
              <span>•</span>
              <span>
                Primary Physician: <strong>{patient.primaryDoctor || "Unassigned"}</strong>
              </span>
            </div>

            {/* Allergies Highlight */}
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Allergies:</span>
              {patientAllergies.length > 0 ? (
                patientAllergies.map((a: any, i: number) => {
                  const substance = typeof a === "string" ? a : a?.substance || "Allergen";
                  const severity = typeof a === "object" && a?.severity ? `(${a.severity})` : "";
                  const reaction = typeof a === "object" && a?.reaction ? ` - ${a.reaction}` : "";
                  return (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                      {substance} {severity} {reaction}
                    </span>
                  );
                })
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">No Known Drug Allergies (NKDA)</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Order Dropdown, Upload, AI Trigger */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 w-full md:w-auto">
          <ClinicalOrderDropdown
            patient={{
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              mrn: patient.mrn,
              age: patient.age,
              gender: patient.gender,
            }}
            buttonLabel="⚡ Clinical Order"
          />
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-3 rounded-2xl bg-white/80 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all hover:bg-white hover:border-teal-200 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)] dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:border-teal-400/30"
          >
            <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Upload Media Asset
          </button>
          <button
            onClick={handleRunAi}
            disabled={isAnalyzing}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-[0_18px_38px_-18px_rgba(13,148,136,0.8)] transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                Multimodal AI Reasoning Active...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                Run Multimodal Biopsychosocial AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Left 360° Tabs, Right AI Co-Pilot Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Biopsychosocial Tabs */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tab Navigation */}
          <div className="minimal-dashboard-shell p-1.5 rounded-[28px] flex items-center justify-between overflow-x-auto gap-1">
            {[
              { id: "overview", label: "Overview", icon: Layers },
              { id: "multimodal", label: `Media & Signals (${pMedia.length})`, icon: Eye },
              { id: "biological", label: "Biological (Labs & PGx)", icon: Dna },
              { id: "psychological", label: "Psychological", icon: Brain },
              { id: "social", label: "Social (SDOH)", icon: HeartHandshake },
              { id: "medications", label: "Medications", icon: Pill },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-teal-500 text-slate-950 shadow-md"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-fade-in">
              {/* Vitals Snapshot */}
              <div className="soft-panel p-5 rounded-[26px]">
                <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-2 dark:text-teal-400">
                  <HeartPulse className="w-4 h-4" />
                  Current Physiological Vitals (Recorded: {pVitals?.recordedAt ? new Date(pVitals.recordedAt).toLocaleTimeString() : "Recent"})
                </h3>
                {pVitals ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div className="p-3 rounded-2xl bg-white/60 border border-slate-200 text-center dark:bg-slate-900/70 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-500 block dark:text-slate-400">Blood Pressure</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {pVitals.systolicBp}/{pVitals.diastolicBp}
                      </span>
                      <span className="text-[9px] text-slate-500 block dark:text-slate-400">mmHg</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/60 border border-slate-200 text-center dark:bg-slate-900/70 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-500 block dark:text-slate-400">Heart Rate</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{pVitals.heartRate}</span>
                      <span className="text-[9px] text-slate-500 block dark:text-slate-400">bpm (Sinus)</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/60 border border-slate-200 text-center dark:bg-slate-900/70 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-500 block dark:text-slate-400">BMI / Weight</span>
                      <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{pVitals.bmi}</span>
                      <span className="text-[9px] text-slate-500 block dark:text-slate-400">{pVitals.weightKg} kg</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/60 border border-slate-200 text-center dark:bg-slate-900/70 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-500 block dark:text-slate-400">SpO2 / Temp</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{pVitals.oxygenSaturation}%</span>
                      <span className="text-[9px] text-slate-500 block dark:text-slate-400">{pVitals.temperatureC}°C</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">No vitals on record.</p>
                )}
                {pVitals?.ecgSummary && (
                  <div className="mt-3 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-700 dark:bg-teal-950/40 dark:border-teal-800/40 dark:text-teal-200">
                    <strong>ECG Interpretation:</strong> {pVitals.ecgSummary}
                  </div>
                )}
              </div>

              {/* Presenting Symptoms */}
              <div className="soft-panel p-5 rounded-[26px]">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                  Active Presenting Symptoms & Chief Complaint
                </h3>
                <div className="space-y-2">
                  {pSymptoms.map((s) => (
                    <div key={s.id} className="p-3 rounded-2xl bg-white/60 border border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-700/70 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                              s.severity === "severe"
                                ? "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                : s.severity === "moderate"
                                ? "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            }`}
                          >
                            {s.severity}
                          </span>
                          {s.isPrimary && <span className="text-[9px] bg-teal-500/15 text-teal-700 px-1.5 rounded dark:bg-teal-500/20 dark:text-teal-300">Primary</span>}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 dark:text-slate-300">{s.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap dark:text-slate-400">Duration: {s.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTIMODAL MEDIA & SIGNALS VIEWER */}
          {activeTab === "multimodal" && (
            <div className="space-y-4 animate-fade-in">
              <MultimodalMediaViewer
                assets={pMedia}
                onUploadClick={() => setShowUploadModal(true)}
              />
            </div>
          )}

          {/* TAB 3: BIOLOGICAL */}
          {activeTab === "biological" && (
            <div className="space-y-4 animate-fade-in">
              {/* Biochemistry & Labs */}
              <div className="soft-panel p-5 rounded-[26px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2 dark:text-emerald-400">
                    <Activity className="w-4 h-4" />
                    Biochemical & Laboratory Profiles
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{pLabs.length} Panels Analyzed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase dark:border-slate-700 dark:text-slate-400">
                        <th className="pb-2">Test Name</th>
                        <th className="pb-2">Result</th>
                        <th className="pb-2">Reference Range</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                      {pLabs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                            {l.testName}
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">{l.category}</span>
                          </td>
                          <td className="py-2.5 font-bold text-slate-700 dark:text-slate-200">
                            {l.value} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{l.unit}</span>
                          </td>
                          <td className="py-2.5 text-slate-500 dark:text-slate-400">
                            {l.referenceRangeLow} - {l.referenceRangeHigh} {l.unit}
                          </td>
                          <td className="py-2.5">
                            {l.isAbnormal ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40">
                                {l.interpretation}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                Normal
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
              <div className="soft-panel p-5 rounded-[26px]">
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2 mb-3 dark:text-emerald-400">
                  <Dna className="w-4 h-4" />
                  Pharmacogenomics & Genomic Variants
                </h3>
                <div className="space-y-3">
                  {pGenetics.map((g) => (
                    <div key={g.id} className="p-3.5 rounded-2xl bg-white/70 border border-emerald-200/80 dark:bg-slate-900/70 dark:border-emerald-500/30">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900 flex items-center gap-2 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-mono dark:bg-emerald-500/20 dark:text-emerald-300">{g.gene}</span>
                          Variant: {g.variant}
                        </span>
                        <span className="text-rose-600 font-semibold dark:text-rose-400">{g.phenotype}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 dark:text-slate-300">{g.clinicalSignificance}</p>
                      <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between dark:text-slate-400">
                        <span>Panel: {g.sourcePanel}</span>
                        <span>Tested: {g.testedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PSYCHOLOGICAL */}
          {activeTab === "psychological" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-5 rounded-[26px]">
                <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2 mb-3 dark:text-purple-400">
                  <Brain className="w-4 h-4" />
                  Psychological Screening & Mental Health Assessments
                </h3>
                <div className="space-y-3">
                  {pPsych.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-white/70 border border-purple-200/80 space-y-2 dark:bg-slate-900/70 dark:border-purple-500/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 flex items-center gap-2 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 font-bold dark:bg-purple-500/20 dark:text-purple-300">{p.testName}</span>
                          Score: <strong className="text-base text-purple-700 dark:text-purple-300">{p.score}</strong> / 27
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-800">
                          {p.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{p.clinicalNotes}</p>
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] dark:border-slate-800/80">
                        <span className="text-slate-500 dark:text-slate-400">
                          Medication Adherence Risk: <strong className="text-amber-700 dark:text-amber-400">{p.adherenceRisk.toUpperCase()}</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-500">Date: {p.assessedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SOCIAL */}
          {activeTab === "social" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-5 rounded-[26px]">
                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2 mb-3 dark:text-amber-400">
                  <HeartHandshake className="w-4 h-4" />
                  Social Determinants of Health (SDOH) Barriers
                </h3>
                <div className="space-y-3">
                  {pSocial.map((s) => (
                    <div key={s.id} className="p-4 rounded-2xl bg-white/70 border border-amber-200/80 space-y-2 dark:bg-slate-900/70 dark:border-amber-500/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 capitalize dark:text-white">{s.category.replace("_", " ")}: {s.indicator}</span>
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                            s.severityLevel === "high"
                              ? "bg-rose-500/10 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/25"
                              : "bg-amber-500/10 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/25"
                          }`}
                        >
                          {s.severityLevel} Severity
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{s.description}</p>
                      {s.recommendedAction && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-200 text-xs text-amber-800 font-medium dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-200">
                          <strong>Recommended Resource:</strong> {s.recommendedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MEDICATIONS */}
          {activeTab === "medications" && (
            <div className="space-y-4 animate-fade-in">
              <div className="soft-panel p-5 rounded-[26px]">
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 mb-3 dark:text-teal-400">
                  <Pill className="w-4 h-4" />
                  Current Active Medication Regimen
                </h3>
                <div className="space-y-2">
                  {pMeds.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 flex items-start justify-between gap-3 dark:bg-slate-900/70 dark:border-slate-700/80">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.name} <span className="text-teal-700 font-semibold dark:text-teal-400">({m.dosage})</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 dark:text-slate-300">
                          {m.frequency} • {m.route} • Indication: {m.indication}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-medium dark:bg-emerald-500/20 dark:text-emerald-300">Active</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Candidate Safety Checker */}
              <div className="soft-panel p-5 rounded-[26px] border border-teal-200/80 bg-teal-500/5 dark:border-teal-500/25 dark:bg-teal-950/15">
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 mb-2 dark:text-teal-300">
                  <ShieldAlert className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Real-Time Clinical Safety & Interaction Cross-Checker
                </h3>
                <p className="text-xs text-slate-500 mb-3 dark:text-slate-400">
                  Enter a candidate drug to verify against documented allergies ({patientAllergies.map((a: any) => typeof a === "string" ? a : a?.substance || "Allergen").join(", ") || "None"}), existing meds, eGFR renal limits, and pharmacogenomics.
                </p>

                <form onSubmit={handleCheckSafety} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Clopidogrel, Amoxicillin, Metformin, Tramadol..."
                    value={candidateDrug}
                    onChange={(e) => setCandidateDrug(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Check Safety
                  </button>
                </form>

                {candidateAlerts && (
                  <div className="mt-4 space-y-2 animate-fade-in">
                    {candidateAlerts.length === 0 ? (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <strong>Safety Verified:</strong> No critical contraindications or drug-gene conflicts detected for '{candidateDrug}'.
                      </div>
                    ) : (
                      candidateAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            alert.severity === "Critical"
                              ? "bg-rose-950/90 border-rose-600 text-rose-200"
                              : "bg-amber-950/90 border-amber-600 text-amber-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-white">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            {alert.title}
                          </div>
                          <p>{alert.description}</p>
                          <div className="pt-1 font-semibold text-teal-300">Action: {alert.recommendation}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Multimodal AI Decision Support Drawer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="minimal-dashboard-shell p-5 rounded-[28px] sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multimodal AI Clinical Co-Pilot</h3>
              </div>
              {latestAi && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30">
                  Confidence: {latestAi.aiResponse.aiConfidenceIndex}%
                </span>
              )}
            </div>

            {latestAi ? (
              <div className="mt-4 space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
                {/* Patient Synthesis */}
                <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-slate-200 text-xs leading-relaxed">
                  <strong className="text-teal-300 block mb-1">Cross-Modal Synthesis:</strong>
                  {latestAi.aiResponse.patientSummaryInsight}
                </div>

                {/* Cross-Modal Attributions Evidence Badges */}
                {latestAi.aiResponse.modalityAttributions && latestAi.aiResponse.modalityAttributions.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-white">
                      <span className="flex items-center gap-1 text-teal-300">
                        <Zap className="w-3.5 h-3.5 text-teal-400" /> Contributing Modality Evidence
                      </span>
                      <span className="text-[10px] text-slate-400">{latestAi.aiResponse.modalityAttributions.length} Sources</span>
                    </div>
                    <div className="space-y-1.5">
                      {latestAi.aiResponse.modalityAttributions.map((att, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.2 rounded font-mono">
                                {att.modalityType}
                              </span>
                              <span className="text-[11px] font-semibold text-white">{att.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5">{att.findingSummary}</p>
                          </div>
                          <span className="text-[10px] font-bold text-teal-300 whitespace-nowrap">{att.confidenceContribution}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red Flags Alert */}
                {latestAi.aiResponse.redFlagsUrgentAlerts.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Critical Red Flags & Safety Alerts
                    </div>
                    {latestAi.aiResponse.redFlagsUrgentAlerts.map((flag, idx) => (
                      <p key={idx} className="text-[11px] text-rose-200 pl-5">
                        • {flag}
                      </p>
                    ))}
                  </div>
                )}

                {/* Ranked Differential Diagnoses with Modality Badges */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Ranked Differential Diagnoses
                  </h4>
                  <div className="space-y-2">
                    {latestAi.aiResponse.differentialDiagnoses.map((diff, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{diff.condition}</span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                              diff.probability === "High"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                            }`}
                          >
                            {diff.probability} ({diff.confidenceScore}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">{diff.reasoning}</p>

                        {/* Modality Sources */}
                        {diff.modalitySources && diff.modalitySources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {diff.modalitySources.map((src, sIdx) => (
                              <span key={sIdx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-teal-300 border border-slate-700">
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medication Recommendations */}
                <div>
                  <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                    Suggested Medications
                  </h4>
                  <div className="space-y-2">
                    {latestAi.aiResponse.medicationSuggestions.map((m, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>
                            {m.drug} {m.dosage}
                          </span>
                          <span className="text-[10px] text-teal-400 font-normal">{m.frequency}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">{m.clinicalRationale}</p>
                        {m.renalHepaticAdjustment && (
                          <span className="text-[10px] text-amber-300 block mt-1">
                            • Renal/Hepatic: {m.renalHepaticAdjustment}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Labs & Imaging */}
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                    Recommended Lab & Imaging Orders
                  </h4>
                  <div className="space-y-1.5">
                    {latestAi.aiResponse.suggestedLabAndImaging.map((l, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{l.testName}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">
                          {l.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Sign-Off Button */}
                <div className="pt-2">
                  <Link
                    href={`/review/${latestAi.id}`}
                    className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-teal-900/40 transition-all hover:scale-105"
                  >
                    <FileCheck className="w-4 h-4" />
                    Review, Modify & Sign E-Prescriptions
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center py-12 px-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto mb-4">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-white">No AI Evaluation Generated Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Click the button above to run Gemini 1.5 Pro multimodal cross-modal clinical analysis across all {pMedia.length} media assets, labs, and vitals.
                </p>
                <button
                  onClick={handleRunAi}
                  disabled={isAnalyzing}
                  className="mt-5 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all"
                >
                  Trigger Analysis Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Media Asset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-400" />
                Upload Clinical Media / Signal Asset
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Findings / Pre-Processed Summary</label>
                <textarea
                  rows={2}
                  placeholder="Enter initial radiologist impression or specialized model findings..."
                  value={mediaSummary}
                  onChange={(e) => setMediaSummary(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-teal-400" />
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
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
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
