"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Calendar,
  Clock,
  Video,
  Building2,
  User,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  MapPin,
  FileText,
  CalendarCheck,
  CalendarX,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Filter,
  Search,
  Check,
  Play,
  Phone,
  FolderOpen,
} from "lucide-react";

interface ClinicalAppointment {
  id: string;
  patientId: string;
  clinicianId: string;
  appointmentType: "in_person" | "telehealth" | string;
  specialty: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  queueToken: string;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | string;
  reason: string;
  notes: string | null;
  patientName?: string;
  patientMrn?: string;
  patientPhone?: string;
  patientGender?: string;
  clinicianName?: string;
  clinicianRole?: string;
  clinicianDept?: string;
  joinUrls?: { patient: string; clinician: string } | null;
  createdAt: string;
}

const TIME_SLOTS = [
  "08:30", "09:00", "09:45", "10:30", "11:15",
  "13:30", "14:15", "15:00", "15:45", "16:30", "17:15"
];

export default function ClinicalAppointmentsManagementPage() {
  const { currentUser, currentRole } = useClinic();
  const [appointments, setAppointments] = useState<ClinicalAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split("T")[0]);
  const [datePreset, setDatePreset] = useState<"today" | "tomorrow" | "all">("today");
  const [providerScope, setProviderScope] = useState<"me" | "all">("me");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Status Action updating state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Reschedule modal state
  const [reschedulingAppt, setReschedulingAppt] = useState<ClinicalAppointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const isStaffOrAdmin =
    currentRole === "system_admin" ||
    currentRole === "tenant_admin" ||
    currentRole === "care_coordinator" ||
    currentRole === "nurse";

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      // If doctor wants only their schedule, filter by clinicianId
      if (providerScope === "me" && currentUser?.id && currentUser.id.length === 36) {
        params.set("clinicianId", currentUser.id);
      }

      if (datePreset !== "all" && dateFilter) {
        params.set("date", dateFilter);
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/v1/appointments?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAppointments(data.data);
      }
    } catch (err) {
      console.error("Failed to load clinical appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [providerScope, currentUser?.id, datePreset, dateFilter, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Quick date presets
  const handleSetPreset = (preset: "today" | "tomorrow" | "all") => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === "today") {
      setDateFilter(today.toISOString().split("T")[0]);
    } else if (preset === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      setDateFilter(tomorrow.toISOString().split("T")[0]);
    } else {
      setDateFilter("");
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    setUpdatingId(appointmentId);
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Appointment status updated to ${newStatus.replace("_", " ")}`);
        fetchAppointments();
      } else {
        showToast(data.error || "Failed to update appointment", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error updating appointment", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Reschedule Confirmation
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt || !newDate || !newTime) return;

    setIsSubmittingReschedule(true);
    try {
      const res = await fetch(`/api/v1/appointments/${reschedulingAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "scheduled",
          scheduledDate: newDate,
          scheduledTime: newTime,
          rescheduleReason: rescheduleNote || "Clinical staff postponed appointment",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Appointment successfully rescheduled and patient notified!");
        setReschedulingAppt(null);
        fetchAppointments();
      } else {
        showToast(data.error || "Failed to reschedule", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error during rescheduling", "error");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (modalityFilter !== "all" && appt.appointmentType !== modalityFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (appt.patientName || "").toLowerCase();
      const mrn = (appt.patientMrn || "").toLowerCase();
      const reason = (appt.reason || "").toLowerCase();
      const doc = (appt.clinicianName || "").toLowerCase();
      const token = (appt.queueToken || "").toLowerCase();
      return name.includes(q) || mrn.includes(q) || reason.includes(q) || doc.includes(q) || token.includes(q);
    }
    return true;
  });

  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
        "pharmacist",
        "dietitian",
        "physiotherapist",
        "psychologist",
        "social_worker",
        "biologist",
        "genetic_counselor",
        "respiratory_therapist",
      ]}
      fallbackTitle="Clinical Appointment Management"
      fallbackMessage="This view is reserved for authorized healthcare clinicians and administrative scheduling staff."
    >
      <div className="space-y-6 pb-16 max-w-6xl mx-auto animate-fade-in">
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
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Top Clinical Header */}
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider">
                Clinical Schedule Hub
              </span>
              <span className="text-xs text-slate-400">
                Staff: <strong className="text-white">{currentUser.fullName}</strong> ({currentRole.replace("_", " ")})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Patient Appointments & Procedures
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage in-person encounters, launch encrypted telehealth rooms, review procedures, and manage queues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchAppointments}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Refresh Schedule"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            </button>
            <Link
              href="/patient/book"
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-teal-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>

        {/* Schedule Controls & Filters Bar */}
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-5 shadow-warm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-[#687B74] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by patient name, MRN, procedure, doctor, or token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-warm text-xs w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>

            {/* Scope Toggle (My Schedule vs All Clinic) */}
            <div>
              <select
                value={providerScope}
                onChange={(e) => setProviderScope(e.target.value as any)}
                className="input-warm text-xs w-full py-2.5 px-3 rounded-xl border border-[#E7E2D8] font-bold text-[#162E27]"
              >
                <option value="me">My Assigned Schedule</option>
                <option value="all">Entire Facility Schedule (All Providers)</option>
              </select>
            </div>

            {/* Modality Filter */}
            <div>
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="input-warm text-xs w-full py-2.5 px-3 rounded-xl border border-[#E7E2D8]"
              >
                <option value="all">All Formats (In-Person + Video)</option>
                <option value="in_person">In-Person Clinic Only</option>
                <option value="telehealth">Telehealth Video Only</option>
              </select>
            </div>
          </div>

          {/* Date Presets & Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F2EFE9]">
            {/* Date Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#687B74] mr-1">Date:</span>
              <button
                onClick={() => handleSetPreset("today")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  datePreset === "today" ? "bg-[#005C4B] text-white" : "bg-[#FAF8F5] text-[#33413C] hover:bg-[#E8F4F0]"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleSetPreset("tomorrow")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  datePreset === "tomorrow" ? "bg-[#005C4B] text-white" : "bg-[#FAF8F5] text-[#33413C] hover:bg-[#E8F4F0]"
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => handleSetPreset("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  datePreset === "all" ? "bg-[#005C4B] text-white" : "bg-[#FAF8F5] text-[#33413C] hover:bg-[#E8F4F0]"
                }`}
              >
                All Dates
              </button>
              {datePreset !== "all" && (
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setDatePreset("today");
                  }}
                  className="input-warm text-xs py-1 px-2.5 rounded-xl border border-[#E7E2D8] text-[#162E27]"
                />
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: "all", label: "All Statuses" },
                { id: "scheduled", label: "Scheduled" },
                { id: "in_progress", label: "In Progress" },
                { id: "completed", label: "Completed" },
                { id: "cancelled", label: "Cancelled" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    statusFilter === s.id
                      ? "bg-[#162E27] text-white"
                      : "bg-[#FAF8F5] text-[#687B74] hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments List View */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-[#005C4B] animate-spin" />
            <p className="text-xs text-[#687B74]">Loading clinical appointments...</p>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((appt) => {
              const isVideo = appt.appointmentType === "telehealth";
              const isScheduled = appt.status === "scheduled" || appt.status === "confirmed";
              const isInProgress = appt.status === "in_progress";

              return (
                <div
                  key={appt.id}
                  className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                    isInProgress
                      ? "border-amber-400 bg-amber-50/30 shadow-warm"
                      : "border-[#E7E2D8] hover:border-[#005C4B]/40 hover:shadow-warm"
                  }`}
                >
                  {/* Top Bar: Modality, Token, Time, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isVideo ? (
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" /> Telehealth Video
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> In-Person Clinic
                        </span>
                      )}

                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F4F0] border border-[#005C4B]/30 text-[#005C4B]">
                        MRN: {appt.patientMrn || `MRN-2026-${appt.patientId.slice(0, 6).toUpperCase()}`}
                      </span>
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E7E2D8] text-[#162E27]">
                        Token: {appt.queueToken}
                      </span>

                      <span className="text-xs text-[#687B74]">
                        Specialty: <strong className="text-[#162E27]">{appt.specialty || "Internal Medicine"}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#162E27] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#005C4B]" />
                          <span>{appt.scheduledDate}</span>
                        </div>
                        <div className="text-xs text-[#687B74] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{appt.scheduledTime} ({appt.durationMinutes || 30}m)</span>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          appt.status === "scheduled" || appt.status === "confirmed"
                            ? "bg-[#E8F4F0] text-[#005C4B]"
                            : appt.status === "in_progress"
                            ? "bg-amber-100 text-amber-900 animate-pulse"
                            : appt.status === "completed"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {appt.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Body: Patient Card & Procedure Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Patient Info */}
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[#687B74] tracking-wider block">
                        Patient Information
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#005C4B] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#162E27]">{appt.patientName || "Verified Patient"}</h4>
                          <p className="text-xs text-[#687B74]">
                            MRN: <span className="font-mono font-bold text-[#162E27]">{appt.patientMrn || "PENDING"}</span>
                          </p>
                        </div>
                      </div>
                      {appt.patientPhone && (
                        <div className="text-xs text-[#687B74] flex items-center gap-1 pt-1">
                          <Phone className="w-3 h-3 text-[#005C4B]" />
                          <span>{appt.patientPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Procedure & Clinical Notes */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#005C4B] tracking-wider block">
                          Procedure / Chief Reason
                        </span>
                        <span className="text-xs text-[#687B74]">
                          Doctor: <strong className="text-[#162E27]">{appt.clinicianName || "Attending Physician"}</strong>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#162E27]">{appt.reason || "General Clinical Encounter"}</h4>
                      <p className="text-xs text-[#687B74] leading-relaxed">
                        {appt.notes || "No special preparation instructions recorded for this visit."}
                      </p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/patients/${appt.patientId}`}
                        className="px-3.5 py-1.5 rounded-full bg-white border border-[#E7E2D8] hover:border-[#005C4B] text-xs font-bold text-[#33413C] flex items-center gap-1 transition-all"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[#005C4B]" />
                        <span>Open Patient EHR</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Telehealth Room Link */}
                      {isVideo && (isScheduled || isInProgress) && (
                        <a
                          href={appt.joinUrls?.clinician || `/telemedicine/room-${appt.id.slice(0, 8)}?role=clinician&sessionId=${appt.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Launch Video Room</span>
                        </a>
                      )}

                      {/* Start / Check-in */}
                      {isScheduled && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "in_progress")}
                          disabled={updatingId === appt.id}
                          className="px-3.5 py-2 rounded-full bg-[#005C4B] hover:bg-[#004A3C] text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Encounter</span>
                        </button>
                      )}

                      {/* Complete Encounter */}
                      {isInProgress && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "completed")}
                          disabled={updatingId === appt.id}
                          className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      {/* Reschedule */}
                      {(isScheduled || isInProgress) && (
                        <button
                          onClick={() => {
                            setReschedulingAppt(appt);
                            setNewDate(appt.scheduledDate || new Date().toISOString().split("T")[0]);
                            setNewTime(appt.scheduledTime || "09:00");
                            setRescheduleNote("");
                          }}
                          className="px-3.5 py-2 rounded-full border border-[#E7E2D8] hover:border-[#005C4B] text-[#33413C] font-semibold text-xs transition-all flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>
                      )}

                      {/* Cancel */}
                      {(isScheduled || isInProgress) && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                          disabled={updatingId === appt.id}
                          className="px-3.5 py-2 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-[#E7E2D8] text-center space-y-4">
            <Calendar className="w-12 h-12 mx-auto text-[#687B74]/50" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#162E27]">No Appointments Found</h3>
              <p className="text-xs text-[#687B74] max-w-sm mx-auto">
                No appointments match your active filter criteria for this date or provider scope.
              </p>
            </div>
            <button
              onClick={() => {
                setStatusFilter("all");
                setModalityFilter("all");
                setDatePreset("all");
                setDateFilter("");
                setSearchQuery("");
              }}
              className="btn-pill-secondary text-xs py-2 px-4 inline-flex items-center gap-1"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Clinical Reschedule Modal */}
        {reschedulingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl max-w-lg w-full p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#162E27]">Reschedule Clinical Appointment</h3>
                    <p className="text-[11px] text-[#687B74]">Patient: {reschedulingAppt.patientName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReschedulingAppt(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#FAF8F5] text-[#687B74]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmReschedule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">New Appointment Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="input-warm text-xs w-full py-2.5 px-3 rounded-xl border border-[#E7E2D8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">New Time Slot</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setNewTime(slot)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          newTime === slot
                            ? "bg-[#005C4B] text-white border-[#005C4B]"
                            : "bg-[#FAF8F5] text-[#33413C] border-[#E7E2D8] hover:bg-white"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">Clinical Reschedule Reason</label>
                  <input
                    type="text"
                    placeholder="e.g., Doctor delayed in surgery, patient conflict, equipment maintenance"
                    value={rescheduleNote}
                    onChange={(e) => setRescheduleNote(e.target.value)}
                    className="input-warm text-xs w-full py-2 px-3 rounded-xl border border-[#E7E2D8]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReschedulingAppt(null)}
                    className="flex-1 py-2.5 rounded-full border border-[#E7E2D8] text-xs font-bold text-[#687B74] hover:bg-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule}
                    className="flex-1 btn-pill-primary py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingReschedule ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Save & Notify Patient</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
