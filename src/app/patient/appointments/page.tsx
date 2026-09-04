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
} from "lucide-react";

interface AppointmentItem {
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
  clinicianName?: string;
  clinicianRole?: string;
  clinicianDept?: string;
  joinUrls?: { patient: string; clinician: string } | null;
  createdAt: string;
}

const TIME_SLOTS = [
  "09:00",
  "09:45",
  "10:30",
  "11:15",
  "13:30",
  "14:15",
  "15:00",
  "15:45",
  "16:30",
  "17:15",
];

export default function PatientAppointmentsPage() {
  const { currentUser, patients } = useClinic();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"upcoming" | "completed" | "cancelled" | "all">("upcoming");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reschedule Modal State
  const [reschedulingAppt, setReschedulingAppt] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("09:00");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Cancel Modal State
  const [cancellingAppt, setCancellingAppt] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const resolvedPatientId =
    (currentUser as any)?.patientId ||
    (patients && patients.length > 0 ? patients[0].id : null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = resolvedPatientId
        ? `/api/v1/appointments?patientId=${resolvedPatientId}`
        : `/api/v1/appointments`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAppointments(data.data);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedPatientId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Reschedule Handler
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt || !rescheduleDate || !rescheduleTime) return;

    setIsSubmittingReschedule(true);
    try {
      const res = await fetch(`/api/v1/appointments/${reschedulingAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "scheduled",
          scheduledDate: rescheduleDate,
          scheduledTime: rescheduleTime,
          rescheduleReason: rescheduleReason || "Patient requested new time slot",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Appointment successfully rescheduled!");
        setReschedulingAppt(null);
        fetchAppointments();
      } else {
        showToast(data.error || "Failed to reschedule", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error while rescheduling", "error");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Cancel Handler
  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;

    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/v1/appointments/${cancellingAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancelReason: cancelReason || "Cancelled by patient",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Appointment cancelled successfully.");
        setCancellingAppt(null);
        fetchAppointments();
      } else {
        showToast(data.error || "Failed to cancel appointment", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error while cancelling", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Filter Appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (filterTab === "upcoming") {
      return appt.status === "scheduled" || appt.status === "confirmed" || appt.status === "in_progress";
    }
    if (filterTab === "completed") {
      return appt.status === "completed";
    }
    if (filterTab === "cancelled") {
      return appt.status === "cancelled";
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
      case "confirmed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F4F0] text-[#005C4B] border border-[#005C4B]/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" /> In Session
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <RoleGuard
      allowedRoles={["patient", "system_admin", "tenant_admin", "physician", "nurse", "care_coordinator"]}
      fallbackTitle="Patient Appointments Portal"
      fallbackMessage="Please sign in to view your upcoming visits, manage appointment schedules, and join virtual consultations."
    >
      <div className="space-y-6 pb-16 max-w-5xl mx-auto animate-fade-in">
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

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="badge-mint text-xs">Care Schedule</span>
              <span className="text-xs text-[#687B74]">
                Patient: <strong className="text-[#162E27]">{currentUser.fullName}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading">
              My Appointments
            </h1>
            <p className="text-xs sm:text-sm text-[#687B74]">
              View procedures, reschedule upcoming visits, or join encrypted telehealth rooms.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchAppointments}
              className="p-2.5 rounded-full border border-[#E7E2D8] hover:bg-[#FAF8F5] text-[#33413C] transition-all"
              title="Refresh Appointments"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#005C4B]" : ""}`} />
            </button>
            <Link
              href="/patient/book"
              className="btn-pill-primary text-xs py-2.5 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Book New Visit</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E7E2D8] pb-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "upcoming", label: "Upcoming Visits", icon: CalendarCheck },
            { id: "completed", label: "Completed Visits", icon: CheckCircle2 },
            { id: "cancelled", label: "Cancelled", icon: CalendarX },
            { id: "all", label: "All History", icon: Calendar },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilterTab(id as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterTab === id
                  ? "bg-[#005C4B] text-white shadow-sm"
                  : "bg-white text-[#33413C] border border-[#E7E2D8] hover:bg-[#FAF8F5]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === id ? "bg-white/20 text-white" : "bg-[#FAF8F5] text-[#687B74]"
                }`}
              >
                {id === "all"
                  ? appointments.length
                  : appointments.filter((a) => {
                      if (id === "upcoming") return a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress";
                      if (id === "completed") return a.status === "completed";
                      if (id === "cancelled") return a.status === "cancelled";
                      return true;
                    }).length}
              </span>
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-[#005C4B] animate-spin" />
            <p className="text-xs text-[#687B74]">Loading your appointments schedule...</p>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((appt) => {
              const isVideo = appt.appointmentType === "telehealth";
              const isUpcoming = appt.status === "scheduled" || appt.status === "confirmed";

              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-3xl border border-[#E7E2D8] hover:border-[#005C4B]/40 hover:shadow-warm transition-all p-5 sm:p-6 space-y-4"
                >
                  {/* Top Row: Format badge, Date/Time & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isVideo ? (
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" /> Virtual Telehealth Video
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> In-Person Clinic Visit
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#005C4B] bg-[#E8F4F0] px-2.5 py-0.5 rounded-full border border-[#005C4B]/30 font-bold">
                        MRN: <strong>{appt.patientMrn || `MRN-2026-${appt.patientId.slice(0, 6).toUpperCase()}`}</strong>
                      </span>
                      <span className="text-[11px] font-mono text-[#162E27] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#E7E2D8] font-bold">
                        Token: <strong>{appt.queueToken}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#162E27] flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#005C4B]" />
                          <span>{appt.scheduledDate}</span>
                        </div>
                        <div className="text-xs text-[#687B74] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{appt.scheduledTime} ({appt.durationMinutes || 30} mins)</span>
                        </div>
                      </div>
                      {getStatusBadge(appt.status)}
                    </div>
                  </div>

                  {/* Middle Content: Procedure & Care Provider */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Reason / Procedure */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#005C4B] tracking-wider block">
                        Procedure / Clinical Reason
                      </span>
                      <h3 className="text-sm font-bold text-[#162E27]">{appt.reason || "General Clinical Consultation"}</h3>
                      <p className="text-xs text-[#687B74] leading-relaxed">
                        {appt.notes || "Standard clinical encounter with your assigned physician. Please arrive 10 minutes prior for vital signs and check-in."}
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-[#687B74]">
                        <span className="font-semibold text-[#162E27]">Specialty:</span> {appt.specialty || "Primary Care"}
                      </div>
                    </div>

                    {/* Assigned Provider */}
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#687B74] tracking-wider block">
                          Assigned Clinician
                        </span>
                        <div className="flex items-center gap-2.5 mt-2">
                          <div className="w-9 h-9 rounded-xl bg-[#005C4B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#162E27]">{appt.clinicianName || "Attending Physician, MD"}</h4>
                            <p className="text-[11px] text-[#687B74]">{appt.clinicianDept || appt.specialty || "Internal Medicine"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-[#005C4B] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Practitioner
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#687B74]">
                      {isVideo ? (
                        <span className="flex items-center gap-1 text-blue-700">
                          <Video className="w-3.5 h-3.5" /> Encrypted WebRTC Video Room
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#005C4B]" /> NiniMed Main Medical Center, Debre Birhan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Telehealth Room Link */}
                      {isVideo && isUpcoming && (
                        <Link
                          href={appt.joinUrls?.patient || `/telemedicine/room-${appt.id.slice(0, 8)}?role=patient&sessionId=${appt.id}`}
                          className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video Room</span>
                        </Link>
                      )}

                      {/* In-Progress / Active: Mark Completed Button */}
                      {(appt.status === "in_progress" || appt.status === "scheduled") && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/v1/appointments/${appt.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "completed" }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                showToast("Appointment marked as completed! Archived in your medical history.");
                                fetchAppointments();
                              }
                            } catch { }
                          }}
                          className="px-3.5 py-2 rounded-full bg-[#E8F4F0] hover:bg-[#005C4B] hover:text-white text-[#005C4B] border border-[#005C4B]/30 font-bold text-xs transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      {/* Completed Visit: View Summary & History */}
                      {appt.status === "completed" && (
                        <button
                          onClick={() => {
                            setReschedulingAppt(null);
                            alert(`Consultation Summary:\n\nProcedure: ${appt.reason}\nClinician: ${appt.clinicianName || "Attending Physician"}\nDate: ${appt.scheduledDate} at ${appt.scheduledTime}\nStatus: Completed & Archived\nNotes: ${appt.notes || "Consultation successfully completed."}`);
                          }}
                          className="px-3.5 py-2 rounded-full bg-[#FAF8F5] border border-[#E7E2D8] hover:bg-white text-[#162E27] font-bold text-xs transition-all flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#005C4B]" />
                          <span>View Summary</span>
                        </button>
                      )}

                      {/* Reschedule Button */}
                      {isUpcoming && (
                        <button
                          onClick={() => {
                            setReschedulingAppt(appt);
                            setRescheduleDate(appt.scheduledDate || new Date().toISOString().split("T")[0]);
                            setRescheduleTime(appt.scheduledTime || "09:00");
                            setRescheduleReason("");
                          }}
                          className="px-3.5 py-2 rounded-full border border-[#E7E2D8] hover:border-[#005C4B] hover:text-[#005C4B] text-[#33413C] font-semibold text-xs transition-all flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>
                      )}

                      {/* Cancel Button */}
                      {isUpcoming && (
                        <button
                          onClick={() => {
                            setCancellingAppt(appt);
                            setCancelReason("");
                          }}
                          className="px-3.5 py-2 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-all flex items-center gap-1"
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
          /* Empty State */
          <div className="bg-white p-12 rounded-3xl border border-[#E7E2D8] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#162E27]">No Appointments Found</h3>
              <p className="text-xs text-[#687B74] max-w-sm mx-auto">
                {filterTab === "upcoming"
                  ? "You have no upcoming appointments scheduled. Book on-demand in-person or video visits anytime."
                  : `No ${filterTab} appointments recorded in your account history.`}
              </p>
            </div>
            <Link
              href="/patient/book"
              className="btn-pill-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule an Appointment
            </Link>
          </div>
        )}

        {/* Reschedule Modal */}
        {reschedulingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl max-w-lg w-full p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#162E27]">Reschedule Appointment</h3>
                    <p className="text-[11px] text-[#687B74]">Token: {reschedulingAppt.queueToken}</p>
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
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs">
                  <div className="text-[10px] text-[#687B74] uppercase font-bold">Procedure / Reason</div>
                  <div className="font-bold text-[#162E27] mt-0.5">{reschedulingAppt.reason}</div>
                  <div className="text-[#687B74] mt-1">Provider: {reschedulingAppt.clinicianName || "Assigned Physician"}</div>
                </div>

                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">Select New Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required
                    className="input-warm text-xs w-full py-2.5 px-3 rounded-xl border border-[#E7E2D8]"
                  />
                </div>

                {/* Time Slots */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">Select Time Slot</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setRescheduleTime(slot)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          rescheduleTime === slot
                            ? "bg-[#005C4B] text-white border-[#005C4B]"
                            : "bg-[#FAF8F5] text-[#33413C] border-[#E7E2D8] hover:bg-white"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Note / Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">Reason for Postponing (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Schedule conflict, feeling better, need morning slot"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
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
                    <span>Confirm Reschedule</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancellingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#162E27]">Cancel Appointment?</h3>
                  <p className="text-[11px] text-[#687B74]">
                    Scheduled on {cancellingAppt.scheduledDate} at {cancellingAppt.scheduledTime}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#687B74] leading-relaxed">
                Are you sure you want to cancel your appointment for <strong className="text-[#162E27]">{cancellingAppt.reason}</strong> with {cancellingAppt.clinicianName || "your provider"}?
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#162E27]">Reason for Cancellation</label>
                <input
                  type="text"
                  placeholder="e.g., Symptoms resolved, conflict, rescheduling later"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input-warm text-xs w-full py-2 px-3 rounded-xl border border-[#E7E2D8]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingAppt(null)}
                  className="flex-1 py-2.5 rounded-full border border-[#E7E2D8] text-xs font-bold text-[#687B74] hover:bg-[#FAF8F5]"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmittingCancel ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Cancel Visit</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
