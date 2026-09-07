"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  UserCheck,
  Stethoscope,
  Pill,
  Bed,
  LogOut,
  MapPin,
  ChevronRight,
  ShieldAlert,
  Send,
  FileText,
  Printer,
  Sparkles,
  PlusCircle,
  Heart,
  Thermometer,
  Wind,
  Zap,
  Users,
  TrendingUp,
  Timer,
  X,
  ChevronDown,
  CheckCircle,
  User,
  ArrowRightCircle,
  FlaskConical,
  Radio,
  Syringe,
} from "lucide-react";
import PrintablePatientCard from "@/components/patient/PrintablePatientCard";

export default function PatientJourneyPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "system_admin",
        "tenant_admin",
        "physician",
        "nurse",
        "nurse_practitioner",
        "pharmacist",
        "lab_technician",
        "radiologist",
        "care_coordinator",
      ]}
      fallbackTitle="Clinical Staff Flow & Patient Journey"
      fallbackMessage="Access restricted to Authorized Clinical Care Personnel."
    >
      <PatientJourneyContent />
    </RoleGuard>
  );
}

type TabType = "triage" | "board" | "rounds";

const ESI_COLORS: Record<number, { bg: string; text: string; label: string; ring: string }> = {
  1: { bg: "bg-red-600", text: "text-white", label: "ESI-1 Resuscitation", ring: "ring-red-500" },
  2: { bg: "bg-orange-500", text: "text-white", label: "ESI-2 Emergent", ring: "ring-orange-500" },
  3: { bg: "bg-yellow-400", text: "text-slate-900", label: "ESI-3 Urgent", ring: "ring-yellow-400" },
  4: { bg: "bg-green-500", text: "text-white", label: "ESI-4 Less Urgent", ring: "ring-green-500" },
  5: { bg: "bg-slate-400", text: "text-white", label: "ESI-5 Non-Urgent", ring: "ring-slate-400" },
};

const STAGE_COLUMNS = [
  { key: "triage", label: "Triage & Intake", color: "border-indigo-500", bg: "bg-indigo-500/10", icon: <Stethoscope className="w-3.5 h-3.5" /> },
  { key: "waiting", label: "Waiting Room", color: "border-amber-500", bg: "bg-amber-500/10", icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "consultation", label: "Consultation", color: "border-teal-500", bg: "bg-teal-500/10", icon: <UserCheck className="w-3.5 h-3.5" /> },
  { key: "lab_pending", label: "Lab Pending", color: "border-cyan-500", bg: "bg-cyan-500/10", icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { key: "radiology_pending", label: "Radiology", color: "border-blue-500", bg: "bg-blue-500/10", icon: <Radio className="w-3.5 h-3.5" /> },
  { key: "lab_ready", label: "Results Ready", color: "border-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "pharmacy", label: "Pharmacy", color: "border-violet-500", bg: "bg-violet-500/10", icon: <Pill className="w-3.5 h-3.5" /> },
  { key: "ward_admission", label: "Inpatient Ward", color: "border-rose-500", bg: "bg-rose-500/10", icon: <Bed className="w-3.5 h-3.5" /> },
  { key: "discharged", label: "Discharged", color: "border-slate-400", bg: "bg-slate-500/10", icon: <LogOut className="w-3.5 h-3.5" /> },
];

function elapsedLabel(enteredAt: string | null | undefined): string {
  if (!enteredAt) return "—";
  const secs = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function extractESI(notes: string | null | undefined): number {
  if (!notes) return 3;
  const m = notes.match(/ESI Level (\d)/);
  return m ? parseInt(m[1]) : 3;
}

function extractChiefComplaint(notes: string | null | undefined): string {
  if (!notes) return "";
  const m = notes.match(/Chief Complaint: ([^|]+)/);
  return m ? m[1].trim() : "";
}

function PatientJourneyContent() {
  const [activeTab, setActiveTab] = useState<TabType>("triage");
  const [journeyData, setJourneyData] = useState<any>(null);
  const [roundsData, setRoundsData] = useState<any>(null);
  const [triageData, setTriageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientForPrint, setSelectedPatientForPrint] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  // Advance stage modal
  const [actionTargetPatient, setActionTargetPatient] = useState<any>(null);
  const [targetNextStage, setTargetNextStage] = useState("consultation");
  const [targetRoom, setTargetRoom] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Ward round entry
  const [roundPatientId, setRoundPatientId] = useState("");
  const [roundBed, setRoundBed] = useState("");
  const [roundAcuity, setRoundAcuity] = useState("stable");
  const [roundNotes, setRoundNotes] = useState("");
  const [roundPlan, setRoundPlan] = useState("");
  const [roundBp, setRoundBp] = useState("");
  const [roundHr, setRoundHr] = useState("");
  const [roundSpo2, setRoundSpo2] = useState("");
  const [roundTemp, setRoundTemp] = useState("");
  const [isSavingRound, setIsSavingRound] = useState(false);

  // Triage intake form
  const [triageSearch, setTriageSearch] = useState("");
  const [triagePatientId, setTriagePatientId] = useState("");
  const [triagePatientLabel, setTriagePatientLabel] = useState("");
  const [triageComplaint, setTriageComplaint] = useState("");
  const [triageLevel, setTriageLevel] = useState(3);
  const [triageBp, setTriageBp] = useState("");
  const [triageHr, setTriageHr] = useState("");
  const [triageSpo2, setTriageSpo2] = useState("");
  const [triageTemp, setTriageTemp] = useState("");
  const [triageRr, setTriageRr] = useState("");
  const [triageRoom, setTriageRoom] = useState("Triage Bay A");
  const [triageStaff, setTriageStaff] = useState("");
  const [triageNotes, setTriageNotes] = useState("");
  const [isSubmittingTriage, setIsSubmittingTriage] = useState(false);
  const [triageSuccess, setTriageSuccess] = useState(false);

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resJ, resR, resT] = await Promise.all([
        fetch("/api/v1/clinical/patient-journey"),
        fetch("/api/v1/clinical/rounds"),
        fetch(`/api/v1/clinical/triage${triageSearch ? `?search=${encodeURIComponent(triageSearch)}` : ""}`),
      ]);
      const [dJ, dR, dT] = await Promise.all([resJ.json(), resR.json(), resT.json()]);
      if (dJ.success) setJourneyData(dJ.data);
      if (dR.success) setRoundsData(dR.data);
      if (dT.success) setTriageData(dT.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [triageSearch]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [loadAll]);

  // Triage intake submission
  const handleTriageSubmit = async () => {
    if (!triagePatientId || !triageComplaint.trim()) return;
    setIsSubmittingTriage(true);
    setTriageSuccess(false);
    try {
      const res = await fetch("/api/v1/clinical/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: triagePatientId,
          chiefComplaint: triageComplaint,
          triageLevel,
          vitalsBp: triageBp || undefined,
          vitalsHr: triageHr ? parseInt(triageHr) : undefined,
          vitalsSpo2: triageSpo2 ? parseInt(triageSpo2) : undefined,
          vitalsTemp: triageTemp ? parseFloat(triageTemp) : undefined,
          vitalsRr: triageRr ? parseInt(triageRr) : undefined,
          locationRoom: triageRoom,
          attendingStaffId: triageStaff || undefined,
          notes: triageNotes || undefined,
          createEncounter: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTriageSuccess(true);
        setTriagePatientId("");
        setTriagePatientLabel("");
        setTriageComplaint("");
        setTriageLevel(3);
        setTriageBp(""); setTriageHr(""); setTriageSpo2(""); setTriageTemp(""); setTriageRr("");
        setTriageNotes("");
        loadAll();
        // Switch to board to see the result
        setTimeout(() => setActiveTab("board"), 1200);
      }
    } catch (err) {
      console.error("Triage submit error:", err);
    } finally {
      setIsSubmittingTriage(false);
    }
  };

  // Advance patient to next stage
  const handleAdvanceStage = async () => {
    if (!actionTargetPatient) return;
    setIsAdvancing(true);
    try {
      await fetch("/api/v1/clinical/patient-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: actionTargetPatient.patientId,
          currentStage: targetNextStage,
          locationRoom: targetRoom || actionTargetPatient.locationRoom,
          notes: actionNotes,
        }),
      });
      if (targetRoom) {
        fetch("/api/v1/patient-flow/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: actionTargetPatient.patientId,
            ticketNumber: actionTargetPatient.patientMrn?.slice(-4) || "001",
            targetLocation: targetRoom,
            estimatedWaitMinutes: 5,
            channel: "in_app",
          }),
        }).catch(() => {});
      }
      setActionTargetPatient(null);
      setActionNotes("");
      setTargetRoom("");
      setSelectedCard(null);
      loadAll();
    } catch (err) {
      console.error("Advance stage error:", err);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Save ward round
  const handleSaveRound = async () => {
    if (!roundPatientId || !roundNotes.trim() || !roundPlan.trim() || !roundBed.trim()) return;
    setIsSavingRound(true);
    try {
      const res = await fetch("/api/v1/clinical/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: roundPatientId,
          bedNumber: roundBed,
          acuityScore: roundAcuity,
          clinicalNotes: roundNotes,
          planOfCare: roundPlan,
          vitalSummary: {
            bp: roundBp || undefined,
            hr: roundHr ? parseInt(roundHr) : undefined,
            spo2: roundSpo2 ? parseInt(roundSpo2) : undefined,
            temp: roundTemp ? parseFloat(roundTemp) : undefined,
          },
        }),
      });
      if (res.ok) {
        setRoundNotes("");
        setRoundPlan("");
        setRoundBp(""); setRoundHr(""); setRoundSpo2(""); setRoundTemp("");
        loadAll();
      }
    } catch (err) {
      console.error("Save round error:", err);
    } finally {
      setIsSavingRound(false);
    }
  };

  const handleAcknowledgeAlert = async (roundId: string) => {
    try {
      await fetch("/api/v1/clinical/rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, action: "acknowledge_alert" }),
      });
      loadAll();
    } catch (err) {
      console.error("Acknowledge error:", err);
    }
  };

  const handleEscalate = async (roundId: string) => {
    try {
      await fetch("/api/v1/clinical/rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, action: "escalate" }),
      });
      loadAll();
    } catch (err) {
      console.error("Escalate error:", err);
    }
  };

  const criticalCount = roundsData?.criticalAlertsCount || 0;
  const totalActive = journeyData?.totalActivePatients || 0;

  // Summary stats
  const waitingCount = journeyData?.activePatientsByStage?.waiting?.length || 0;
  const labPendingCount = journeyData?.activePatientsByStage?.lab_pending?.length || 0;
  const dischargedCount = journeyData?.dischargedTodayCount || 0;

  // Filter available triage patients by search
  const availablePatients = (triageData?.availablePatients || []).filter((p: any) => {
    if (!triageSearch) return true;
    const q = triageSearch.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.mrn?.toLowerCase().includes(q);
  });

  const staff = triageData?.staff || [];

  // Inpatient patients for round entry
  const inpatientPatients = (journeyData?.activePatientsByStage?.ward_admission || []);

  return (
    <div className="space-y-5">
      {/* ─── HEADER ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Real-Time Clinical Flow & Patient Journey
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Triage Intake • Kanban Flow Board • Ward Rounds • Wayfinding Dispatch
              &nbsp;· refreshed {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {([
              { id: "triage", label: "Triage Intake", badge: triageData?.availableCount },
              { id: "board", label: "Flow Board", badge: totalActive },
              { id: "rounds", label: "Ward Rounds", badge: criticalCount, danger: criticalCount > 0 },
            ] as any[]).map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      tab.danger ? "bg-rose-500 text-white animate-pulse" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            id="btn-refresh-journey"
            onClick={loadAll}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── CRITICAL ALERTS BANNER ───────────────────────── */}
      {criticalCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/50 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                CRITICAL ALERTS ACTIVE — {criticalCount} PATIENT{criticalCount > 1 ? "S" : ""} ESCALATED
              </p>
              <p className="text-xs text-rose-800 dark:text-rose-300">
                Immediate acuity escalation required. Deteriorating vital trends or critical lab values flagged.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("rounds")}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap shadow-sm transition-all"
          >
            Review Now
          </button>
        </div>
      )}

      {/* ─── STATS BAR ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Active Patients", value: totalActive, icon: <Users className="w-4 h-4 text-teal-500" />, color: "text-teal-600" },
          { label: "In Waiting Room", value: waitingCount, icon: <Clock className="w-4 h-4 text-amber-500" />, color: "text-amber-600" },
          { label: "Lab Pending", value: labPendingCount, icon: <FlaskConical className="w-4 h-4 text-cyan-500" />, color: "text-cyan-600" },
          { label: "Critical Alerts", value: criticalCount, icon: <AlertTriangle className="w-4 h-4 text-rose-500" />, color: "text-rose-600" },
          { label: "Discharged Today", value: dischargedCount, icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs"
          >
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">{s.icon}</div>
            <div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 1: TRIAGE INTAKE                               */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "triage" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Patient Selector — Left Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              Select Patient for Triage
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                id="triage-search"
                type="text"
                placeholder="Search by name or MRN…"
                value={triageSearch}
                onChange={(e) => setTriageSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
              {isLoading && availablePatients.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Loading patients…</p>
              )}
              {!isLoading && availablePatients.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  {triageSearch ? "No patients match your search." : "All registered patients are currently active in the flow."}
                </p>
              )}
              {availablePatients.map((p: any) => {
                const isSelected = triagePatientId === p.id;
                return (
                  <button
                    key={p.id}
                    id={`patient-select-${p.id}`}
                    onClick={() => {
                      setTriagePatientId(p.id);
                      setTriagePatientLabel(`${p.firstName} ${p.lastName} — MRN ${p.mrn}`);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 ring-1 ring-indigo-500"
                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                          {p.mrn} &bull; {p.age}y &bull; {p.gender}
                        </p>
                        {p.bloodType && (
                          <p className="text-[10px] text-slate-500">{p.bloodType}</p>
                        )}
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {triageData && (
              <p className="text-[10px] text-slate-400 text-center">
                {triageData.availableCount} patients available for intake &bull; {triageData.activeJourneyCount} currently in flow
              </p>
            )}
          </div>

          {/* Triage Form — Right Panel */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-500" />
                Triage Assessment Form
              </h2>
              {triagePatientId && (
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {triagePatientLabel}
                </span>
              )}
            </div>

            {/* ESI Level */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                ESI Triage Level *
              </label>
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const esi = ESI_COLORS[lvl];
                  return (
                    <button
                      key={lvl}
                      id={`esi-level-${lvl}`}
                      onClick={() => setTriageLevel(lvl)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                        triageLevel === lvl
                          ? `${esi.bg} ${esi.text} border-transparent ring-2 ${esi.ring} ring-offset-1 shadow-md`
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <p className="text-lg font-black leading-none">{lvl}</p>
                      <p className="text-[8px] font-semibold leading-tight mt-0.5">
                        {["Resus", "Emergent", "Urgent", "Less Urg.", "Non-Urg."][lvl - 1]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Chief Complaint *
              </label>
              <input
                id="triage-chief-complaint"
                type="text"
                value={triageComplaint}
                onChange={(e) => setTriageComplaint(e.target.value)}
                placeholder="e.g. Chest pain, shortness of breath, fever…"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </div>

            {/* Vitals Row */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Heart className="w-3 h-3" /> Vital Signs (optional)
              </label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-1.5">
                {[
                  { label: "BP (mmHg)", placeholder: "120/80", value: triageBp, set: setTriageBp, id: "triage-bp" },
                  { label: "HR (bpm)", placeholder: "72", value: triageHr, set: setTriageHr, id: "triage-hr" },
                  { label: "SpO₂ (%)", placeholder: "98", value: triageSpo2, set: setTriageSpo2, id: "triage-spo2" },
                  { label: "Temp (°C)", placeholder: "36.8", value: triageTemp, set: setTriageTemp, id: "triage-temp" },
                  { label: "RR (/min)", placeholder: "16", value: triageRr, set: setTriageRr, id: "triage-rr" },
                ].map((v) => (
                  <div key={v.id}>
                    <p className="text-[9px] text-slate-500 mb-1">{v.label}</p>
                    <input
                      id={v.id}
                      type="text"
                      value={v.value}
                      onChange={(e) => v.set(e.target.value)}
                      placeholder={v.placeholder}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Staff Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <MapPin className="w-3 h-3 inline mr-1" />Triage Bay / Room
                </label>
                <input
                  id="triage-room"
                  type="text"
                  value={triageRoom}
                  onChange={(e) => setTriageRoom(e.target.value)}
                  placeholder="e.g. Triage Bay A"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <UserCheck className="w-3 h-3 inline mr-1" />Attending Staff
                </label>
                <select
                  id="triage-staff"
                  value={triageStaff}
                  onChange={(e) => setTriageStaff(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  <option value="">Auto-assign</option>
                  {staff.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Additional Notes
              </label>
              <textarea
                id="triage-notes"
                rows={2}
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                placeholder="Allergies, onset, associated symptoms…"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </div>

            {/* Success message */}
            {triageSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle className="w-4 h-4" />
                Patient registered into triage flow! Switching to Flow Board…
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-submit-triage"
              onClick={handleTriageSubmit}
              disabled={isSubmittingTriage || !triagePatientId || !triageComplaint.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              {isSubmittingTriage ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Registering Patient…</>
              ) : (
                <><PlusCircle className="w-4 h-4" /> Admit to Triage Flow</>
              )}
            </button>

            {!triagePatientId && (
              <p className="text-[10px] text-slate-400 text-center">
                ← Select a patient from the left panel to begin
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 2: PATIENT FLOW BOARD (KANBAN)                 */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "board" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="board-search"
                type="text"
                placeholder="Search patient by name or MRN…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Timer className="w-3.5 h-3.5" />
              <span>Auto-refresh every 15s</span>
            </div>
          </div>

          {/* Kanban columns */}
          <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
            {STAGE_COLUMNS.map((col) => {
              const stagePatients = (journeyData?.activePatientsByStage?.[col.key] || []).filter(
                (p: any) =>
                  searchQuery === "" ||
                  `${p.patientFirstName} ${p.patientLastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.patientMrn?.includes(searchQuery)
              );

              return (
                <div
                  key={col.key}
                  className={`flex-shrink-0 w-68 rounded-2xl border-2 ${col.color} bg-white dark:bg-slate-900/80 p-3 flex flex-col max-h-[72vh] shadow-sm`}
                  style={{ minWidth: "16rem" }}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      {col.icon} {col.label}
                    </span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {stagePatients.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                    {stagePatients.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-8 opacity-60">Empty</p>
                    ) : (
                      stagePatients.map((item: any) => {
                        const esi = extractESI(item.notes);
                        const esiStyle = ESI_COLORS[esi] || ESI_COLORS[3];
                        const complaint = extractChiefComplaint(item.notes);
                        const elapsed = elapsedLabel(item.enteredAt);
                        const isLongWait = (item.transitDurationSeconds || 0) > 1800 && col.key === "waiting";

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all space-y-1.5 cursor-pointer hover:shadow-md ${
                              isLongWait
                                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400"
                                : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-teal-500/40"
                            }`}
                            onClick={() => setSelectedCard(item)}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                                  {item.patientFirstName} {item.patientLastName}
                                </p>
                                <p className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                                  {item.patientMrn}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${esiStyle.bg} ${esiStyle.text}`}>
                                  ESI {esi}
                                </span>
                                <button
                                  id={`print-${item.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPatientForPrint({
                                      id: item.patientId,
                                      mrn: item.patientMrn,
                                      firstName: item.patientFirstName,
                                      lastName: item.patientLastName,
                                      gender: item.patientGender,
                                      bloodType: item.patientBloodType || "N/A",
                                      ticketNumber: item.patientMrn?.slice(-4),
                                      destinationRoom: item.locationRoom,
                                    });
                                  }}
                                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {complaint && (
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 italic truncate">
                                {complaint}
                              </p>
                            )}

                            {item.locationRoom && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                                {item.locationRoom}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                              <span className={`flex items-center gap-1 ${isLongWait ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                                <Timer className="w-2.5 h-2.5" />
                                {elapsed}
                                {isLongWait && " ⚠ Long wait"}
                              </span>
                              <button
                                id={`advance-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionTargetPatient(item);
                                  setTargetRoom(item.locationRoom || "");
                                  // Pre-select logical next stage
                                  const stageIndex = STAGE_COLUMNS.findIndex((c) => c.key === col.key);
                                  const nextStage = STAGE_COLUMNS[stageIndex + 1]?.key || "discharged";
                                  setTargetNextStage(nextStage);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all"
                              >
                                Advance <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 3: WARD ROUNDS                                 */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "rounds" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Rounds List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bed className="w-4 h-4 text-rose-500" />
              Inpatient Bed Rounds ({roundsData?.totalInpatients || 0})
            </h2>

            {!roundsData?.rounds?.length ? (
              <div className="p-10 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Bed className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No inpatient rounds recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Complete ward round entries using the form →</p>
              </div>
            ) : (
              roundsData.rounds.map((round: any) => {
                const vitals = round.vitalSummary as any;
                const isAcuteCritical = round.acuityScore === "critical" || round.acuityScore === "deteriorating";
                return (
                  <div
                    key={round.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      round.acuityScore === "critical"
                        ? "bg-rose-500/10 border-rose-500/40"
                        : round.acuityScore === "deteriorating"
                        ? "bg-amber-500/10 border-amber-500/40"
                        : round.acuityScore === "discharge_ready"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Patient Info */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {round.patientFirstName} {round.patientLastName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {round.bedNumber} &bull; {round.wardDepartment}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            round.acuityScore === "critical"
                              ? "bg-rose-600 text-white"
                              : round.acuityScore === "deteriorating"
                              ? "bg-amber-500 text-slate-950"
                              : round.acuityScore === "discharge_ready"
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          }`}>
                            {round.acuityScore}
                          </span>
                        </div>

                        {/* Vitals strip */}
                        {vitals && Object.values(vitals).some(Boolean) && (
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-600 dark:text-slate-400">
                            {vitals.bp && <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> {vitals.bp} mmHg</span>}
                            {vitals.hr && <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-orange-400" /> {vitals.hr} bpm</span>}
                            {vitals.spo2 && <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-blue-400" /> SpO₂ {vitals.spo2}%</span>}
                            {vitals.temp && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-amber-400" /> {vitals.temp}°C</span>}
                          </div>
                        )}

                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
                          <span className="font-semibold">Assessment:</span> {round.clinicalNotes}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          <span className="font-semibold">Plan:</span> {round.planOfCare}
                        </p>

                        {/* Critical alerts */}
                        {round.criticalAlerts && (round.criticalAlerts as any[]).length > 0 && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {(round.criticalAlerts as string[]).map((alert, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> {alert}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="text-right shrink-0 space-y-1.5">
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(round.createdAt).toLocaleTimeString()}
                        </span>
                        <div className="flex flex-col gap-1">
                          {round.isEscalated && !round.acknowledgedAt && (
                            <button
                              id={`ack-${round.id}`}
                              onClick={() => handleAcknowledgeAlert(round.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shadow-sm transition-all"
                            >
                              Acknowledge
                            </button>
                          )}
                          {!round.isEscalated && round.acuityScore !== "critical" && (
                            <button
                              id={`escalate-${round.id}`}
                              onClick={() => handleEscalate(round.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] font-bold shadow-sm transition-all"
                            >
                              Escalate
                            </button>
                          )}
                          {round.acknowledgedAt && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Ack'd
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Round Entry Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-500" />
              New Ward Round Entry
            </h2>

            {/* Patient selector */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Patient *</label>
              <select
                id="round-patient"
                value={roundPatientId}
                onChange={(e) => setRoundPatientId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="">— Select ward patient —</option>
                {inpatientPatients.map((p: any) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.patientFirstName} {p.patientLastName} ({p.patientMrn})
                  </option>
                ))}
                {/* Fallback: all rounds patients */}
                {roundsData?.rounds?.map((r: any) => (
                  <option key={r.patientId} value={r.patientId}>
                    {r.patientFirstName} {r.patientLastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Bed Number *</label>
              <input
                id="round-bed"
                type="text"
                value={roundBed}
                onChange={(e) => setRoundBed(e.target.value)}
                placeholder="e.g. Bed 204-A"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Acuity Status</label>
              <select
                id="round-acuity"
                value={roundAcuity}
                onChange={(e) => setRoundAcuity(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="stable">Stable</option>
                <option value="monitoring">Monitoring</option>
                <option value="deteriorating">Deteriorating</option>
                <option value="critical">Critical</option>
                <option value="discharge_ready">Ready for Discharge</option>
              </select>
            </div>

            {/* Vitals */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Vital Signs</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {[
                  { label: "BP", placeholder: "120/80", value: roundBp, set: setRoundBp, id: "round-bp" },
                  { label: "HR", placeholder: "74 bpm", value: roundHr, set: setRoundHr, id: "round-hr" },
                  { label: "SpO₂ %", placeholder: "98", value: roundSpo2, set: setRoundSpo2, id: "round-spo2" },
                  { label: "Temp °C", placeholder: "36.8", value: roundTemp, set: setRoundTemp, id: "round-temp" },
                ].map((v) => (
                  <div key={v.id}>
                    <p className="text-[9px] text-slate-500">{v.label}</p>
                    <input
                      id={v.id}
                      type="text"
                      value={v.value}
                      onChange={(e) => v.set(e.target.value)}
                      placeholder={v.placeholder}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Clinical Assessment *</label>
              <textarea
                id="round-notes"
                rows={2}
                value={roundNotes}
                onChange={(e) => setRoundNotes(e.target.value)}
                placeholder="Subjective & objective round findings…"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Plan of Care *</label>
              <textarea
                id="round-plan"
                rows={2}
                value={roundPlan}
                onChange={(e) => setRoundPlan(e.target.value)}
                placeholder="Antibiotic course, repeat labs, discharge plan…"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              id="btn-save-round"
              onClick={handleSaveRound}
              disabled={isSavingRound || !roundNotes.trim() || !roundPlan.trim() || !roundPatientId || !roundBed.trim()}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isSavingRound ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recording…</>
              ) : (
                <><FileText className="w-3.5 h-3.5" /> Save Round Note</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── ADVANCE STAGE MODAL ──────────────────────────── */}
      {actionTargetPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Advance: {actionTargetPatient.patientFirstName} {actionTargetPatient.patientLastName}
                </h3>
                <p className="text-xs text-slate-500">MRN: {actionTargetPatient.patientMrn} &bull; Current: {actionTargetPatient.currentStage}</p>
              </div>
              <button
                onClick={() => setActionTargetPatient(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Next Journey Stage</label>
              <select
                id="advance-stage-select"
                value={targetNextStage}
                onChange={(e) => setTargetNextStage(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="waiting">Waiting Room</option>
                <option value="consultation">Consultation Room</option>
                <option value="lab_pending">Lab Draw Station</option>
                <option value="radiology_pending">Radiology</option>
                <option value="lab_ready">Results Ready</option>
                <option value="pharmacy">Pharmacy Dispense</option>
                <option value="ward_admission">Inpatient Ward Admission</option>
                <option value="discharged">Discharge / Complete</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Destination Room / Wayfinding
              </label>
              <input
                id="advance-room-input"
                type="text"
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                placeholder="e.g. Room 204 — Lab Draw Station B"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                <Send className="w-3 h-3" /> Will dispatch live wayfinding notification to patient.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Handover Notes</label>
              <textarea
                id="advance-notes"
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Brief clinical context for next station staff…"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActionTargetPatient(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-advance"
                onClick={handleAdvanceStage}
                disabled={isAdvancing}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isAdvancing ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Routing…</>
                ) : (
                  <><ArrowRightCircle className="w-3.5 h-3.5" /> Confirm Transit</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PATIENT CARD DETAIL DRAWER ───────────────────── */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedCard.patientFirstName} {selectedCard.patientLastName}
                </h3>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-mono font-bold">
                  {selectedCard.patientMrn} &bull; {selectedCard.patientGender} &bull; Age {selectedCard.patientAge || "—"}
                </p>
              </div>
              <button onClick={() => setSelectedCard(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Current Stage</p>
                <p className="font-bold text-slate-900 dark:text-white capitalize">{selectedCard.currentStage?.replace("_", " ")}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Location</p>
                <p className="font-bold text-slate-900 dark:text-white">{selectedCard.locationRoom || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Time in Stage</p>
                <p className="font-bold text-slate-900 dark:text-white">{elapsedLabel(selectedCard.enteredAt)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Blood Type</p>
                <p className="font-bold text-slate-900 dark:text-white">{selectedCard.patientBloodType || "N/A"}</p>
              </div>
            </div>

            {selectedCard.notes && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-800 dark:text-indigo-200">
                <p className="font-bold mb-1 text-[10px] uppercase text-indigo-500">Triage Notes</p>
                {selectedCard.notes}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActionTargetPatient(selectedCard);
                  setTargetRoom(selectedCard.locationRoom || "");
                  const stageIndex = STAGE_COLUMNS.findIndex((c) => c.key === selectedCard.currentStage);
                  setTargetNextStage(STAGE_COLUMNS[stageIndex + 1]?.key || "discharged");
                  setSelectedCard(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowRightCircle className="w-4 h-4" /> Advance Stage
              </button>
              <button
                onClick={() => {
                  setSelectedPatientForPrint({
                    id: selectedCard.patientId,
                    mrn: selectedCard.patientMrn,
                    firstName: selectedCard.patientFirstName,
                    lastName: selectedCard.patientLastName,
                    gender: selectedCard.patientGender,
                    bloodType: selectedCard.patientBloodType || "N/A",
                    ticketNumber: selectedCard.patientMrn?.slice(-4),
                    destinationRoom: selectedCard.locationRoom,
                  });
                  setSelectedCard(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Card Modal */}
      {selectedPatientForPrint && (
        <PrintablePatientCard
          patient={selectedPatientForPrint}
          onClose={() => setSelectedPatientForPrint(null)}
        />
      )}
    </div>
  );
}
