"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Video,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Phone,
  RefreshCw,
  XCircle,
} from "lucide-react";
import MessageThread from "../case/MessageThread";
import CaseTimeline from "../case/CaseTimeline";

interface LiveQueueStatusProps {
  caseId: string;
  queueId?: string;
  initialPosition?: number;
  initialWaitMinutes?: number;
  doctorInfo?: {
    fullName?: string;
    specialty?: string;
    role?: string;
    avatarUrl?: string;
  };
  careFormat?: "video" | "chat";
  roomUrl?: string;
  onCancel?: () => void;
}

export default function LiveQueueStatus({
  caseId,
  queueId,
  initialPosition = 1,
  initialWaitMinutes = 3,
  doctorInfo,
  careFormat = "video",
  roomUrl,
  onCancel,
}: LiveQueueStatusProps) {
  const [position, setPosition] = useState(initialPosition);
  const [waitMinutes, setWaitMinutes] = useState(initialWaitMinutes);
  const [queueStatus, setQueueStatus] = useState<string>("waiting");
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "chat" | "timeline">("queue");
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Polling for live queue advancement
  const checkStatus = async () => {
    try {
      const targetId = queueId || caseId;
      const res = await fetch(`/api/v1/treat-me-now/${targetId}/status`);
      const d = await res.json();
      if (d.success && d.data) {
        setPosition(d.data.queuePosition ?? position);
        setWaitMinutes(d.data.estimatedWaitMinutes ?? waitMinutes);
        setQueueStatus(d.data.queueStatus || "waiting");
        setIsReady(d.data.isReady || d.data.queuePosition <= 1);
        if (d.data.timeline) {
          setTimelineEvents(d.data.timeline);
        }
      }
    } catch (e) {
      console.error("Queue status poll error:", e);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Poll every 3 seconds for instant updates
    return () => clearInterval(interval);
  }, [caseId, queueId]);

  const doctorName = doctorInfo?.fullName || "On-Call Clinical Physician, MD";
  const doctorSpecialty = doctorInfo?.specialty || "Urgent Care & Virtual Medicine Lead";
  const initials = doctorName.replace(/^Dr\.\s*/i, "").split(" ").map((n) => n[0]).join("").slice(0, 2) || "MD";

  const effectiveRoomUrl = roomUrl || `/telemedicine/room-${caseId}?role=patient&format=${careFormat}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ready Alert Banner */}
      {isReady ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50 space-y-4 text-emerald-200 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
            <h3 className="text-xl font-extrabold text-white">Your Clinician is Ready to See You!</h3>
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            {doctorName} has opened your consultation room and is awaiting your connection.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <a
              href={effectiveRoomUrl}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950"
            >
              <Video className="w-5 h-5" />
              <span>Join Virtual Exam Room Now</span>
            </a>
          </div>
        </div>
      ) : (
        /* Queue Progress Card */
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
                Treat Me Now™ Live Queue
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-0.5">
                You are <span className="text-teal-400 font-mono">#{position}</span> in line
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Estimated Wait
              </span>
              <span className="text-2xl font-extrabold text-white font-mono flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-cyan-400" />
                ~{waitMinutes} min
              </span>
            </div>
          </div>

          {/* Animated Queue Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span className="text-teal-400 font-bold">1. Triage Completed</span>
              <span className="text-teal-400 font-bold">2. Doctor Assigned</span>
              <span className={position <= 1 ? "text-teal-400 font-bold" : "text-slate-500"}>
                3. Room Prep
              </span>
              <span className={isReady ? "text-teal-400 font-bold" : "text-slate-600"}>
                4. Visit Live
              </span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700 shadow-md shadow-teal-500/50"
                style={{
                  width: position === 1 ? "85%" : position === 2 ? "55%" : "35%",
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live queue updating in real-time
              </span>
              <span className="font-mono text-slate-500">Case #{caseId}</span>
            </div>
          </div>

          {/* Assigned Doctor Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-slate-950 font-extrabold text-base flex items-center justify-center shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-white truncate">{doctorName}</h4>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold uppercase shrink-0">
                  On-Call Lead
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{doctorSpecialty}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Case Chat and Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-slate-900 text-teal-400 border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Visit Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "chat"
                ? "bg-slate-900 text-teal-400 border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Care Team</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-slate-900 text-teal-400 border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Case Timeline</span>
          </button>
        </div>

        {/* Tab 1: Overview & Guidelines */}
        {activeTab === "queue" && (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 text-xs text-slate-300">
            <h4 className="font-extrabold text-white text-sm">Preparing for Your Urgent Care Visit:</h4>
            <ul className="space-y-2.5 text-slate-400">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Keep this browser tab open. An alert will chime as soon as your clinician connects.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Ensure your microphone and camera permissions are allowed if joining via video.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Prescriptions will be routed electronically to your preferred pharmacy immediately following the visit.</span>
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={effectiveRoomUrl}
                className="py-3 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-teal-900/30"
              >
                <Video className="w-4 h-4" />
                <span>Launch Exam Room</span>
              </a>

              <Link
                href="/patient/dashboard"
                className="py-3 px-6 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs"
              >
                Go to Patient Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Tab 2: Chat */}
        {activeTab === "chat" && (
          <MessageThread
            caseId={caseId}
            currentUserName="Patient"
            currentUserRole="patient"
          />
        )}

        {/* Tab 3: Timeline */}
        {activeTab === "timeline" && (
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
            <CaseTimeline events={timelineEvents} currentStatus={queueStatus} />
          </div>
        )}
      </div>
    </div>
  );
}
