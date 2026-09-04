"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  Building2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface TelegramAppt {
  id: string;
  patientName: string;
  queueToken: string;
  scheduledTime: string;
  appointmentType: string;
  reason: string;
  status: string;
}

export default function TelegramMiniAppPage() {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [appointments, setAppointments] = useState<TelegramAppt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "schedule" | "status">("queue");

  useEffect(() => {
    // Mock or fetch today's active queue
    const fetchQueue = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/v1/appointments?status=scheduled&limit=10");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAppointments(
            data.data.map((a: any) => ({
              id: a.id,
              patientName: a.patientName || "Verified Patient",
              queueToken: a.queueToken || "T-101",
              scheduledTime: a.scheduledTime || "09:30",
              appointmentType: a.appointmentType || "telehealth",
              reason: a.reason || "General Consultation",
              status: a.status || "scheduled",
            }))
          );
        }
      } catch { } finally {
        setIsLoading(false);
      }
    };
    fetchQueue();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col p-4 max-w-md mx-auto animate-fade-in font-sans">
      {/* Mini App Top App Bar */}
      <header className="flex items-center justify-between py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-500/30">
            NM
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">NiniMed TMA</h1>
            <p className="text-[10px] text-teal-400">Clinical Provider Mobile Hub</p>
          </div>
        </div>

        {/* Live On-Duty Toggle */}
        <button
          onClick={() => setIsOnDuty(!isOnDuty)}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            isOnDuty
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnDuty ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span>{isOnDuty ? "On Duty" : "Off Duty"}</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl my-3 border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab("queue")}
          className={`py-2 rounded-xl font-bold transition-all ${
            activeTab === "queue" ? "bg-teal-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Live Queue
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`py-2 rounded-xl font-bold transition-all ${
            activeTab === "schedule" ? "bg-teal-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Schedule
        </button>
        <button
          onClick={() => setActiveTab("status")}
          className={`py-2 rounded-xl font-bold transition-all ${
            activeTab === "status" ? "bg-teal-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Profile
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {activeTab === "queue" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Patients in Queue: {appointments.length}</span>
              <span className="text-teal-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Real-time
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 mx-auto text-teal-400 animate-spin mb-2" />
                Loading queue...
              </div>
            ) : appointments.length > 0 ? (
              appointments.map((appt) => {
                const isVideo = appt.appointmentType === "telehealth";
                return (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{appt.patientName}</span>
                        <span className="font-mono text-[10px] bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded">
                          {appt.queueToken}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{appt.scheduledTime}</span>
                    </div>

                    <p className="text-xs text-slate-300">{appt.reason}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      {isVideo ? (
                        <span className="text-[10px] text-blue-400 flex items-center gap-1 font-semibold">
                          <Video className="w-3 h-3" /> Video Visit
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <Building2 className="w-3 h-3" /> In-Person Clinic
                        </span>
                      )}

                      <a
                        href={`/telemedicine/room-${appt.id.slice(0, 8)}?role=clinician&sessionId=${appt.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Video className="w-3 h-3" />
                        <span>Launch Call</span>
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                No active patients in waitlist.
              </div>
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              Today's Shift Hours
            </h3>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Working Shift:</span>
                <strong className="text-white font-mono">09:00 – 17:00</strong>
              </div>
              <div className="flex justify-between">
                <span>Services:</span>
                <strong className="text-teal-400">Video + Clinic Visits</strong>
              </div>
            </div>
            <Link
              href="/provider/profile"
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1.5 hover:bg-slate-700"
            >
              <span>Edit Full Schedule in Portal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {activeTab === "status" && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Staff Clinician</h4>
                <p className="text-[11px] text-teal-400">License: MD-782914-TX</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">HR Verification:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Approved & Live
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Rate:</span>
                <span className="text-white font-mono">500.00 ETB / Consult</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-2 text-center text-[10px] text-slate-500 border-t border-slate-800/60 mt-4">
        NiniMed Telegram Mini App · Encrypted Healthcare Network
      </footer>
    </div>
  );
}
