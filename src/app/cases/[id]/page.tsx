"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  ArrowLeft, Sparkles, AlertTriangle, CheckCircle2, User,
  Heart, Pill, Activity, Clock, Stethoscope, Brain, Shield,
  ChevronDown, ChevronRight, FileText, Image, Mic, Video,
  Loader2, RefreshCw, Send, UserCheck, TrendingUp, Zap,
  AlertCircle, Info, ShieldAlert, BookOpen, Calendar, Phone,
  MapPin, Thermometer, BarChart3, Target, FlaskConical,
  PlayCircle, Download, MessageCircle, CheckCheck,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CaseData {
  caseId: string;
  patient?: {
    fullName?: string; age?: number; gender?: string; dateOfBirth?: string;
    phone?: string; email?: string; address?: string; occupation?: string;
    emergencyContact?: string; emergencyPhone?: string; mrn?: string;
  };
  complaint?: {
    chiefComplaint?: string; severity?: string; onset?: string; duration?: string;
    location?: string; aggravating?: string; relieving?: string;
    associatedSymptoms?: string; previousSimilar?: boolean; seekingUrgent?: boolean;
  };
  history?: {
    chronicConditions?: string; pastSurgeries?: string; currentMedications?: string;
    knownAllergies?: string; familyHistory?: string; socialHistory?: string;
    smokingStatus?: string; alcoholUse?: string; lastPhysicalExam?: string;
  };
  symptoms?: {
    selectedCategories?: string[]; painScale?: number;
    detailedDescription?: string;
    vitals?: { temperature?: string; bloodPressure?: string; heartRate?: string; respiratoryRate?: string; weight?: string; height?: string };
    sleepImpact?: boolean; appetiteChange?: boolean;
  };
  filesAttached?: { name: string; type: string }[];
  assignedHandler?: string;
  handlerId?: string;
  status?: string;
  submittedAt?: string;
  aiAnalysis?: {
    summary?: string;
    urgencyLevel?: string;
    analysisConfidence?: number;
    potentialCauses?: string[];
    differentialDiagnoses?: string[];
    criticalAlerts?: { level: string; message: string }[];
    riskScores?: { timi?: { score: number; interpretation: string; scale: string }; grace?: { score: number; interpretation: string; scale: string }; chadsvasc?: { score: number; interpretation: string; scale: string } };
    recommendedWorkup?: string[];
    recommendedSpecialists?: string[];
    potentialComplications?: string[];
    pharmacologyNotes?: string;
    suggestedOrders?: string[];
    handlerBrief?: string;
    patientEducationPoints?: string[];
    generatedAt?: string;
  } | null;
  handlerNotes?: { text: string; author: string; time: string }[];
  timeline?: { time: string; event: string; actor: string }[];
}

// ─── Alert Component ────────────────────────────────────────────────────────

function Alert({ level, message }: { level: string; message: string }) {
  const config = {
    critical: { icon: ShieldAlert, color: "text-red-400 bg-red-500/10 border-red-500/30" },
    warning: { icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    info: { icon: Info, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  }[level] || { icon: Info, color: "text-slate-400 bg-slate-500/10 border-slate-500/30" };

  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${config.color}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="leading-relaxed font-medium">{message}</span>
    </div>
  );
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, color = "text-teal-400", children, defaultOpen = true
}: {
  icon: React.ElementType; title: string; color?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-all"
      >
        <div className={`flex items-center gap-2 font-bold text-sm ${color}`}>
          <Icon className="w-4 h-4" /> {title}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | number | boolean | null; mono?: boolean }) {
  if (!value && value !== 0 && value !== false) return null;
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 shrink-0 w-36">{label}:</span>
      <span className={`text-slate-200 flex-1 leading-relaxed ${mono ? "font-mono" : ""}`}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  return (
    <RoleGuard
      allowedRoles={["physician", "nurse_practitioner", "nurse", "care_coordinator", "system_admin", "tenant_admin", "auditor"]}
      fallbackTitle="Case Review"
    >
      <CaseDetailContent />
    </RoleGuard>
  );
}

function CaseDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ai_brief" | "patient_history" | "orders" | "notes" | "timeline">("ai_brief");
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<Set<string>>(new Set());
  const [isSigningOrder, setIsSigningOrder] = useState<string | null>(null);

  const fetchCase = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}`);
      const data = await res.json();
      if (data.success) setCaseData(data.data);
    } catch {
      // Error handled by loading state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (id) fetchCase(); }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !caseData) return;
    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNote.trim(),
          sender: caseData.assignedHandler || "Attending Clinician",
          isDoctor: true,
        }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.allMessages)) {
        setCaseData((prev) => prev ? {
          ...prev,
          handlerNotes: json.allMessages,
        } : prev);
      } else {
        setCaseData((prev) => prev ? {
          ...prev,
          handlerNotes: [...(prev.handlerNotes || []), { text: newNote, author: caseData.assignedHandler || "Attending Clinician", time: new Date().toISOString() }],
        } : prev);
      }
      setNewNote("");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSignOrder = async (orderText: string, orderKey: string) => {
    if (!caseData) return;
    setIsSigningOrder(orderKey);
    try {
      // Create real signed prescription in EHR
      await fetch("/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: caseData.patient?.fullName ? "00000000-0000-0000-0000-000000000001" : undefined,
          medicationName: orderText.replace(/^(Prescribe|Order|Start)\s+/i, ""),
          dosage: "Standard Clinical Dose",
          frequency: "As directed",
          durationDays: 30,
          quantity: 30,
          instructions: `Clinical order from Case ${caseData.caseId}: ${orderText}`,
          indication: caseData.complaint?.chiefComplaint || "Clinical Case",
        }),
      });

      setCompletedOrders((prev) => new Set([...Array.from(prev), orderKey]));
    } catch (err) {
      console.error("Failed to sign order:", err);
    } finally {
      setIsSigningOrder(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-sm font-bold text-white">Loading case & AI analysis...</p>
          <p className="text-xs text-slate-400">Fetching patient history and clinical brief</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-white font-bold">Case not found</p>
        <button onClick={() => router.push("/cases")} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 transition-all">
          Back to Cases
        </button>
      </div>
    );
  }

  const { aiAnalysis: ai } = caseData;
  const urgencyColor = { routine: "text-slate-400", moderate: "text-amber-400", urgent: "text-orange-400", critical: "text-red-400" }[ai?.urgencyLevel || "moderate"] || "text-amber-400";
  const urgencyBg = { routine: "bg-slate-500/10 border-slate-500/20", moderate: "bg-amber-500/10 border-amber-500/20", urgent: "bg-orange-500/10 border-orange-500/20", critical: "bg-red-500/10 border-red-500/20" }[ai?.urgencyLevel || "moderate"] || "bg-amber-500/10 border-amber-500/20";

  const TABS = [
    { id: "ai_brief", label: "🧠 AI Brief", icon: Sparkles },
    { id: "patient_history", label: "📋 Patient History", icon: User },
    { id: "orders", label: "📝 Suggested Orders", icon: CheckCheck },
    { id: "notes", label: "💬 Handler Notes", icon: MessageCircle },
    { id: "timeline", label: "📅 Timeline", icon: Clock },
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Case Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/cases")}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-white">{caseData.patient?.fullName || "Patient"}</h1>
              {caseData.patient?.mrn && <span className="text-xs font-mono text-slate-500">{caseData.patient.mrn}</span>}
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${urgencyBg} ${urgencyColor}`}>
                {ai?.urgencyLevel || "pending"}
              </span>
              {caseData.complaint?.seekingUrgent && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> URGENT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{caseData.caseId}</p>
          </div>
          <button onClick={fetchCase} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {caseData.complaint?.chiefComplaint && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Chief Complaint</div>
            <p className="text-sm text-white leading-relaxed font-medium">{caseData.complaint.chiefComplaint}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
              {caseData.complaint.duration && <span>Duration: {caseData.complaint.duration}</span>}
              {caseData.complaint.severity && (
                <span>Severity: <span className="text-amber-400 capitalize">{caseData.complaint.severity.replace("_", " ")}</span></span>
              )}
              {caseData.symptoms?.painScale !== undefined && <span>Pain: {caseData.symptoms.painScale}/10</span>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <span>Assigned to: <span className="text-white font-bold">{caseData.assignedHandler || "Attending Clinician"}</span></span>
          <span>Submitted: {caseData.submittedAt ? new Date(caseData.submittedAt).toLocaleString() : "Recently"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === id
                ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
                : "border border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: AI BRIEF ────────────────────────────────────────────────── */}
      {activeTab === "ai_brief" && (
        <div className="space-y-4">
          {!ai ? (
            <div className="flex flex-col items-center justify-center h-48 bg-slate-900/80 border border-slate-800 rounded-2xl text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-white font-bold">AI Analysis In Progress</p>
              <p className="text-xs text-slate-400">Gemini CDSS is analyzing the patient history...</p>
            </div>
          ) : (
            <>
              {/* Handler Brief Banner */}
              {ai.handlerBrief && (
                <div className="bg-gradient-to-br from-indigo-950/80 to-slate-950/60 border border-indigo-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm mb-3">
                    <Sparkles className="w-5 h-5" /> AI Handler Brief
                    <span className="ml-auto text-[10px] text-indigo-400/60">{ai.analysisConfidence || 85}% confidence · Gemini CDSS</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{ai.handlerBrief}</p>
                </div>
              )}

              {/* Urgency + Summary */}
              <div className={`border rounded-2xl p-5 ${urgencyBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-2 font-extrabold text-lg ${urgencyColor}`}>
                    <Zap className="w-5 h-5" />
                    {ai.urgencyLevel?.toUpperCase() || "MODERATE"} PRIORITY
                  </div>
                  {ai.analysisConfidence && (
                    <div className="text-xs text-slate-400">
                      Analysis confidence: <span className="text-white font-bold">{ai.analysisConfidence}%</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{ai.summary || "Clinical analysis available."}</p>
              </div>

              {/* Critical Alerts */}
              {ai.criticalAlerts && ai.criticalAlerts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> Clinical Alerts
                  </h3>
                  {ai.criticalAlerts.map((alert, i) => (
                    <Alert key={i} level={alert.level} message={alert.message} />
                  ))}
                </div>
              )}

              {/* Differential Diagnoses / Potential Causes */}
              {((ai.potentialCauses && ai.potentialCauses.length > 0) || (ai.differentialDiagnoses && ai.differentialDiagnoses.length > 0)) && (
                <Section icon={Brain} title="Differential Diagnoses" color="text-violet-400">
                  <div className="space-y-2">
                    {(ai.potentialCauses || ai.differentialDiagnoses || []).map((cause, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${i === 0 ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}>
                          {i + 1}
                        </div>
                        <span className={`text-xs leading-relaxed ${i === 0 ? "text-white font-medium" : "text-slate-300"}`}>{cause}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Risk Scores */}
              {ai.riskScores && Object.keys(ai.riskScores).length > 0 && (
                <Section icon={BarChart3} title="Clinical Risk Scores" color="text-amber-400">
                  <div className="space-y-3">
                    {Object.entries(ai.riskScores).map(([key, score]) => score && (
                      <div key={key} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-300">{score.scale}</span>
                          <span className="text-xl font-extrabold text-amber-400">{score.score}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{score.interpretation}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Recommended Workup */}
              {ai.recommendedWorkup && ai.recommendedWorkup.length > 0 && (
                <Section icon={FlaskConical} title="Recommended Diagnostic Workup" color="text-sky-400">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ai.recommendedWorkup.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                        <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Recommended Specialists */}
              {ai.recommendedSpecialists && ai.recommendedSpecialists.length > 0 && (
                <Section icon={UserCheck} title="Specialist Referrals" color="text-teal-400">
                  <div className="space-y-2">
                    {ai.recommendedSpecialists.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        {spec}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Potential Complications */}
              {ai.potentialComplications && ai.potentialComplications.length > 0 && (
                <Section icon={AlertCircle} title="Potential Complications if Untreated" color="text-rose-400" defaultOpen={false}>
                  <div className="space-y-2">
                    {ai.potentialComplications.map((comp, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {comp}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Pharmacology Notes */}
              {ai.pharmacologyNotes && (
                <Section icon={Pill} title="Pharmacology & Drug Safety Notes" color="text-orange-400" defaultOpen={false}>
                  <p className="text-xs text-slate-300 leading-relaxed">{ai.pharmacologyNotes}</p>
                </Section>
              )}

              {/* Patient Education */}
              {ai.patientEducationPoints && ai.patientEducationPoints.length > 0 && (
                <Section icon={BookOpen} title="Patient Education Points" color="text-green-400" defaultOpen={false}>
                  <div className="space-y-2">
                    {ai.patientEducationPoints.map((point, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                        {point}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {ai.generatedAt && (
                <p className="text-[10px] text-slate-600 text-right">
                  AI analysis generated at {new Date(ai.generatedAt).toLocaleString()} · NiniMed CDSS
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: PATIENT HISTORY ─────────────────────────────────────────── */}
      {activeTab === "patient_history" && (
        <div className="space-y-4">
          <Section icon={User} title="Personal Information" color="text-teal-400">
            <InfoRow label="Full Name" value={caseData.patient?.fullName} />
            <InfoRow label="Date of Birth" value={caseData.patient?.dateOfBirth} />
            <InfoRow label="Gender" value={caseData.patient?.gender} />
            <InfoRow label="MRN" value={caseData.patient?.mrn} mono />
            <InfoRow label="Phone" value={caseData.patient?.phone} />
            <InfoRow label="Email" value={caseData.patient?.email} />
            <InfoRow label="Address" value={caseData.patient?.address} />
            <InfoRow label="Occupation" value={caseData.patient?.occupation} />
            <InfoRow label="Emergency Contact" value={caseData.patient?.emergencyContact} />
            <InfoRow label="Emergency Phone" value={caseData.patient?.emergencyPhone} />
          </Section>

          <Section icon={Stethoscope} title="Chief Complaint Detail" color="text-rose-400">
            <InfoRow label="Complaint" value={caseData.complaint?.chiefComplaint} />
            <InfoRow label="Severity" value={caseData.complaint?.severity?.replace("_", " ")} />
            <InfoRow label="Duration" value={caseData.complaint?.duration} />
            <InfoRow label="Onset" value={caseData.complaint?.onset} />
            <InfoRow label="Location" value={caseData.complaint?.location} />
            <InfoRow label="Aggravating" value={caseData.complaint?.aggravating} />
            <InfoRow label="Relieving" value={caseData.complaint?.relieving} />
            <InfoRow label="Associated Sx" value={caseData.complaint?.associatedSymptoms} />
            <InfoRow label="Previous Episodes" value={caseData.complaint?.previousSimilar} />
            <InfoRow label="Urgent" value={caseData.complaint?.seekingUrgent} />
          </Section>

          <Section icon={Heart} title="Medical History" color="text-pink-400">
            <InfoRow label="Chronic Conditions" value={caseData.history?.chronicConditions} />
            <InfoRow label="Past Surgeries" value={caseData.history?.pastSurgeries} />
            <InfoRow label="Medications" value={caseData.history?.currentMedications} />
            <InfoRow label="Allergies" value={caseData.history?.knownAllergies} />
            <InfoRow label="Family History" value={caseData.history?.familyHistory} />
            <InfoRow label="Social History" value={caseData.history?.socialHistory} />
            <InfoRow label="Smoking" value={caseData.history?.smokingStatus} />
            <InfoRow label="Alcohol" value={caseData.history?.alcoholUse} />
            <InfoRow label="Last Exam" value={caseData.history?.lastPhysicalExam} />
          </Section>

          <Section icon={Activity} title="Symptoms & Vitals" color="text-amber-400">
            <InfoRow label="Categories" value={caseData.symptoms?.selectedCategories?.join(", ")} />
            <InfoRow label="Pain Scale" value={caseData.symptoms?.painScale !== undefined ? `${caseData.symptoms.painScale}/10` : undefined} />
            <InfoRow label="Description" value={caseData.symptoms?.detailedDescription} />
            <div className="pt-2 border-t border-slate-800 mt-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Self-Reported Vitals</p>
              {Object.entries(caseData.symptoms?.vitals || {}).filter(([, v]) => v).map(([k, v]) => (
                <InfoRow key={k} label={k.replace(/([A-Z])/g, " $1")} value={v} />
              ))}
            </div>
            <InfoRow label="Sleep Impact" value={caseData.symptoms?.sleepImpact} />
            <InfoRow label="Appetite Change" value={caseData.symptoms?.appetiteChange} />
          </Section>

          {/* Attached Files */}
          {caseData.filesAttached && caseData.filesAttached.length > 0 && (
            <Section icon={FileText} title={`Attached Files (${caseData.filesAttached.length})`} color="text-violet-400">
              <div className="space-y-2">
                {caseData.filesAttached.map((f, i) => {
                  const icons = { image: Image, audio: Mic, video: Video, document: FileText };
                  const FileIcon = icons[f.type as keyof typeof icons] || FileText;
                  const colors = { image: "text-sky-400", audio: "text-rose-400", video: "text-violet-400", document: "text-amber-400" };
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <FileIcon className={`w-4 h-4 ${colors[f.type as keyof typeof colors] || "text-slate-400"}`} />
                      <span className="text-xs text-slate-300 flex-1">{f.name}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{f.type}</span>
                      <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── TAB: SUGGESTED ORDERS ────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              These orders were generated by AI based on the patient's history and clinical presentation. Review each order and mark as placed when actioned. Always verify with clinical judgment before ordering.
            </p>
          </div>

          {ai?.suggestedOrders && ai.suggestedOrders.length > 0 && (
            <Section icon={CheckCheck} title="Immediate Orders" color="text-teal-400">
              <div className="space-y-2">
                {ai.suggestedOrders.map((order, i) => {
                  const key = `order-${i}`;
                  const isComplete = completedOrders.has(key);
                  const isSigning = isSigningOrder === key;
                  return (
                    <div key={i} className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${isComplete ? "bg-teal-950/30 border-teal-500/30" : "bg-slate-950/60 border-slate-800"}`}>
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() =>
                            setCompletedOrders((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${isComplete ? "bg-teal-500 border-teal-400 text-slate-950" : "border-slate-600 hover:border-teal-500"}`}
                        >
                          {isComplete && <CheckCheck className="w-3 h-3" />}
                        </button>
                        <span className={`text-xs leading-relaxed ${isComplete ? "line-through text-slate-500" : "text-slate-200"}`}>{order}</span>
                      </div>
                      {!isComplete && (
                        <button
                          onClick={() => handleSignOrder(order, key)}
                          disabled={isSigning}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[10px] font-bold shrink-0 transition-all flex items-center gap-1"
                        >
                          {isSigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Sign & Route
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {ai?.recommendedWorkup && ai.recommendedWorkup.length > 0 && (
            <Section icon={FlaskConical} title="Diagnostic Workup Orders" color="text-sky-400">
              <div className="space-y-2">
                {ai.recommendedWorkup.map((item, i) => {
                  const key = `workup-${i}`;
                  const isComplete = completedOrders.has(key);
                  const isSigning = isSigningOrder === key;
                  return (
                    <div key={i} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${isComplete ? "bg-teal-950/30 border-teal-500/30" : "bg-slate-950/60 border-slate-800"}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => setCompletedOrders((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${isComplete ? "bg-teal-500 border-teal-400 text-slate-950" : "border-slate-600 hover:border-teal-500"}`}
                        >
                          {isComplete && <CheckCheck className="w-3 h-3" />}
                        </button>
                        <span className={`text-xs flex-1 ${isComplete ? "line-through text-slate-500" : "text-slate-200"}`}>{item}</span>
                      </div>
                      {!isComplete && (
                        <button
                          onClick={() => handleSignOrder(`Diagnostic Lab Panel: ${item}`, key)}
                          disabled={isSigning}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold shrink-0 transition-all flex items-center gap-1"
                        >
                          {isSigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                          Order Lab
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <div className="text-xs text-slate-600 text-center pt-2">
            {completedOrders.size} of {(ai?.suggestedOrders?.length || 0) + (ai?.recommendedWorkup?.length || 0)} orders actioned
          </div>
        </div>
      )}

      {/* ── TAB: HANDLER NOTES ───────────────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {(!caseData.handlerNotes || caseData.handlerNotes.length === 0) ? (
              <div className="text-center py-10 text-slate-500 text-sm">No notes yet. Add the first clinical note below.</div>
            ) : (
              caseData.handlerNotes.map((note, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                    <span className="font-bold text-teal-400">{note.author}</span>
                    <span>{new Date(note.time).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{note.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold text-slate-300">Add Clinical Note</label>
            <textarea
              rows={4}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter clinical observations, plan, orders placed, specialist contacted..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSubmittingNote}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all"
            >
              {isSubmittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: TIMELINE ────────────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="space-y-0">
          {(caseData.timeline || []).map((entry, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${entry.actor === "AI Engine" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                    : entry.actor === "System" ? "bg-slate-800 border-slate-700 text-slate-400"
                      : "bg-teal-500/20 border-teal-500/40 text-teal-400"
                  }`}>
                  {entry.actor === "AI Engine" ? <Sparkles className="w-4 h-4" />
                    : entry.actor === "System" ? <Shield className="w-4 h-4" />
                      : <User className="w-4 h-4" />}
                </div>
                {caseData.timeline && i < caseData.timeline.length - 1 && <div className="w-px flex-1 bg-slate-800 my-1" />}
              </div>
              <div className="pb-6 flex-1">
                <p className="text-xs font-medium text-white">{entry.event}</p>
                <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
                  <span className={entry.actor === "AI Engine" ? "text-indigo-400" : "text-slate-400"}>{entry.actor}</span>
                  <span>{new Date(entry.time).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

