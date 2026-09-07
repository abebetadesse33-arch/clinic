"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Sparkles,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Building2,
  Video,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Flame,
  HeartPulse,
  Send,
  Plus,
  Calendar,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface TriageCaseItem {
  id: string;
  caseId?: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  age?: number;
  gender?: string;
  chiefComplaint: string;
  symptoms?: string[];
  severity: "critical" | "severe" | "moderate" | "mild" | string;
  status: "pending_triage" | "triaged" | "assigned" | "in_progress" | "resolved" | string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  department?: string;
  submittedAt: string;
  vitals?: {
    hr?: number;
    bp?: string;
    temp?: number;
    spo2?: number;
  };
}

const TRIAGE_LEVELS = [
  { level: 1, label: "Level 1: Resuscitation / Immediate", color: "bg-rose-600 text-white", border: "border-rose-700", badge: "CRITICAL" },
  { level: 2, label: "Level 2: Emergent / Severe", color: "bg-rose-500/20 text-rose-300", border: "border-rose-500/40", badge: "EMERGENT" },
  { level: 3, label: "Level 3: Urgent", color: "bg-amber-500/20 text-amber-300", border: "border-amber-500/40", badge: "URGENT" },
  { level: 4, label: "Level 4: Less Urgent", color: "bg-blue-500/20 text-blue-300", border: "border-blue-500/40", badge: "STANDARD" },
  { level: 5, label: "Level 5: Non-Urgent / Routine", color: "bg-emerald-500/20 text-emerald-300", border: "border-emerald-500/40", badge: "ROUTINE" },
];

const DEPARTMENTS = [
  "24/7 Virtual Urgent Care",
  "Internal Medicine & Primary Care",
  "Cardiology & Hypertension",
  "Pediatric Acute Care",
  "Mental Health & Psychosocial",
  "Pulmonology & Respiratory",
  "Dermatology & Skin Clinic",
  "Emergency Triage & Resuscitation",
];

export default function TriageWorkspacePage() {
  const { currentUser, currentRole, patients } = useClinic();
  const [triageQueue, setTriageQueue] = useState<TriageCaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<TriageCaseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Doctors list for assignment
  const [doctorsList, setDoctorsList] = useState<Array<{ id: string; name: string; specialty: string }>>([]);

  // Triage assessment form state
  const [triageLevel, setTriageLevel] = useState<number>(3);
  const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [triageNotes, setTriageNotes] = useState<string>("");
  const [assignedModality, setAssignedModality] = useState<"telehealth" | "in_person">("telehealth");
  const [isRouting, setIsRouting] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchTriageData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active cases and pending intakes
      const res = await fetch("/api/v1/cases?limit=30", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.cases)) {
        const mapped: TriageCaseItem[] = data.data.cases.map((c: any) => ({
          id: c.id || c.caseId,
          caseId: c.caseId,
          patientId: c.patientId || (patients && patients[0]?.id) || "00000000-0000-0000-0000-000000000001",
          patientName: c.patientName || `${patients?.[0]?.firstName || "Patient"} ${patients?.[0]?.lastName || ""}`,
          patientMrn: c.patientMrn || patients?.[0]?.mrn || "MRN-PENDING",
          chiefComplaint: c.chiefComplaint || c.complaint?.chiefComplaint || "Intake Assessment",
          symptoms: c.symptoms || [],
          severity: c.severity || "moderate",
          status: c.status || "pending_triage",
          assignedDoctorName: c.assignedHandlerName,
          submittedAt: c.submittedAt || new Date().toISOString(),
          vitals: c.vitals,
        }));
        setTriageQueue(mapped);
        if (!selectedCase && mapped.length > 0) {
          setSelectedCase(mapped[0]);
        }
      }

      // 2. Fetch doctors roster
      const docRes = await fetch("/api/v1/public/providers");
      const docData = await docRes.json();
      if (docData.success && Array.isArray(docData.data)) {
        setDoctorsList(docData.data);
        if (docData.data.length > 0 && !selectedDocId) {
          setSelectedDocId(docData.data[0].id);
        }
      }
    } catch (err) {
      console.error("Triage data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [patients, selectedCase, selectedDocId]);

  useEffect(() => {
    fetchTriageData();
  }, [fetchTriageData]);

  // Handle Triage Routing & Provider Assignment
  const handleCompleteTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setIsRouting(true);
    try {
      const assignedDoc = doctorsList.find((d) => d.id === selectedDocId);
      const assignedDocName = assignedDoc?.name || "Assigned Attending Physician";

      // 1. Create scheduled appointment / video conference with assigned clinician
      const apptPayload = {
        patientId: selectedCase.patientId,
        clinicianId: selectedDocId || undefined,
        appointmentType: assignedModality,
        specialty: assignedDoc?.specialty || "Internal Medicine",
        scheduledDate: new Date().toISOString().split("T")[0],
        scheduledTime: "Immediate / On-Demand",
        durationMinutes: 30,
        reason: `${selectedDept} | ${selectedCase.chiefComplaint}`,
        notes: `Triage Level ${triageLevel} (${TRIAGE_LEVELS.find((l) => l.level === triageLevel)?.badge}). Triage Notes: ${triageNotes || "Routed by Triage Specialist."}`,
      };

      const apptRes = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apptPayload),
      });
      const apptData = await apptRes.json();

      if (apptData.success) {
        showToast(
          `Patient ${selectedCase.patientName} triaged (Level ${triageLevel}) and routed to ${assignedDocName} (${selectedDept})!`
        );
        fetchTriageData();
      } else {
        showToast(apptData.error || "Failed to route triage appointment", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Triage routing network error", "error");
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <RoleGuard
      allowedRoles={[
        "triage_staff",
        "nurse",
        "physician",
        "nurse_practitioner",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Clinical Triage Center"
      fallbackMessage="Access to the Triage & Patient Routing Center is restricted to clinical intake specialists, registered nurses, and attending physicians."
    >
      <div className="space-y-6 pb-16 max-w-7xl mx-auto animate-fade-in">
        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl text-xs font-bold shadow-warm-lg flex items-center gap-2 animate-fade-in ${
              toastMsg.type === "success" ? "bg-[#005C4B] text-white" : "bg-rose-600 text-white"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Triage & Rapid Patient Routing Center
              </span>
              <span className="text-xs text-slate-400">
                Staff: <strong className="text-white">{currentUser.fullName}</strong> ({currentRole.replace("_", " ")})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Clinical Triage & Provider Assignment
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Evaluate incoming symptoms, assign emergency severity indices (ESI Level 1-5), and route patients to doctors or encrypted video exam rooms.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchTriageData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Refresh Triage Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            </button>
            <Link
              href="/appointments"
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-teal-900/30"
            >
              <Calendar className="w-4 h-4" />
              <span>Appointments Hub</span>
            </Link>
          </div>
        </div>

        {/* Main 2-Column Workspace: Left Queue & Right Evaluation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Incoming Patients & Intake Queue */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 shadow-warm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Intake Triage Queue</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                  {triageQueue.length} Active Intakes
                </span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto text-teal-400 animate-spin" />
                  <p className="text-xs text-slate-400">Loading intake cases...</p>
                </div>
              ) : triageQueue.length > 0 ? (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {triageQueue.map((item) => {
                    const isSelected = selectedCase?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedCase(item)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? "bg-slate-800 border-amber-500/60 shadow-lg shadow-amber-500/10"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.patientName}</span>
                            <span className="text-[10px] font-mono text-slate-400">({item.patientMrn})</span>
                          </div>
                          <span
                            className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              item.severity === "critical"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                                : item.severity === "severe"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-teal-500/20 text-teal-300 border-teal-500/40"
                            }`}
                          >
                            {item.severity}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2">{item.chiefComplaint}</p>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(item.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="text-amber-300 font-semibold flex items-center gap-0.5">
                            Evaluate <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No pending intakes in queue. All patients evaluated!
                </div>
              )}
            </div>
          </div>

          {/* Right 7 Cols: Triage Evaluation & Provider Routing Form */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCase ? (
              <form onSubmit={handleCompleteTriage} className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-warm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Active Evaluation</span>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-teal-400" />
                      {selectedCase.patientName}
                    </h2>
                    <p className="text-xs text-slate-400">MRN: {selectedCase.patientMrn}</p>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Reported Complaint</span>
                    <span className="text-xs font-bold text-slate-200">{selectedCase.chiefComplaint}</span>
                  </div>
                </div>

                {/* 1. Triage Severity Level Selector (ESI 1-5) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Emergency Severity Index (ESI Level)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TRIAGE_LEVELS.map((lvl) => (
                      <button
                        type="button"
                        key={lvl.level}
                        onClick={() => setTriageLevel(lvl.level)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          triageLevel === lvl.level
                            ? "bg-slate-800 border-amber-400 shadow-md"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">Level {lvl.level}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${lvl.color} ${lvl.border}`}>
                            {lvl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{lvl.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Department & Specialty Routing */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>Assign Clinical Department</span>
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Doctor Assignment */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-teal-400" />
                    <span>Assign Attending Physician / Clinician</span>
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-medium"
                  >
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} • {doc.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Modality (Video Telehealth vs In-Person Exam Room) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white">Encounter Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAssignedModality("telehealth")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        assignedModality === "telehealth"
                          ? "bg-blue-600/30 border-blue-400 text-blue-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Video className="w-4 h-4 text-blue-400" />
                      <span>Encrypted Video Room</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignedModality("in_person")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        assignedModality === "in_person"
                          ? "bg-emerald-600/30 border-emerald-400 text-emerald-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>In-Person Clinic Exam</span>
                    </button>
                  </div>
                </div>

                {/* 5. Triage Clinical Note */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white">Triage Staff Clinical Directive</label>
                  <textarea
                    rows={3}
                    placeholder="Enter triage notes, vital signs assessment, red flag warnings, or prep instructions..."
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white resize-none"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isRouting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-teal-500/20 disabled:opacity-50"
                >
                  {isRouting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  <span>Route Patient to Doctor & Initialize Video Encounter</span>
                </button>
              </form>
            ) : (
              <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-12 text-center text-slate-400 space-y-3">
                <Stethoscope className="w-12 h-12 mx-auto text-slate-600" />
                <h3 className="text-base font-bold text-white">Select a Patient from the Intake Queue</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Click on any incoming patient case on the left to evaluate severity and route to an attending clinician.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
