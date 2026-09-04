"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Stethoscope,
  FlaskConical,
  FileText,
  Calendar,
  AlertTriangle,
  Send,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export interface TimelineEventItem {
  time: string;
  event: string;
  actor: string;
  role?: string;
  details?: string;
  stage?: string;
}

interface CaseTimelineProps {
  events: TimelineEventItem[];
  currentStatus?: string;
}

export default function CaseTimeline({ events = [], currentStatus }: CaseTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl bg-slate-900/40">
        No case timeline events recorded yet.
      </div>
    );
  }

  const getEventIcon = (event: string, role?: string) => {
    const ev = event.toLowerCase();
    const ro = role?.toLowerCase() || "";

    if (ev.includes("ai") || ro === "system") return { icon: Sparkles, bg: "bg-teal-500/20 text-teal-400 border-teal-500/40" };
    if (ev.includes("assigned") || ro === "care_coordinator") return { icon: UserCheck, bg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" };
    if (ev.includes("consultation") || ro === "physician") return { icon: Stethoscope, bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
    if (ev.includes("lab") || ev.includes("test")) return { icon: FlaskConical, bg: "bg-purple-500/20 text-purple-400 border-purple-500/40" };
    if (ev.includes("message") || ev.includes("chat")) return { icon: Send, bg: "bg-sky-500/20 text-sky-400 border-sky-500/40" };
    if (ev.includes("emergency") || ev.includes("escalated")) return { icon: AlertTriangle, bg: "bg-red-500/20 text-red-400 border-red-500/40" };
    if (ev.includes("complete") || ev.includes("resolved")) return { icon: CheckCircle2, bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };

    return { icon: Clock, bg: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  return (
    <div className="space-y-6">
      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-800 space-y-6">
        {events.map((item, index) => {
          const { icon: Icon, bg } = getEventIcon(item.event, item.role);
          const dateObj = item.time ? new Date(item.time) : new Date();
          const timeFormatted = isNaN(dateObj.getTime())
            ? item.time
            : dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
              " · " +
              dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

          return (
            <div key={index} className="relative group">
              {/* Node Icon on vertical line */}
              <div
                className={`absolute -left-[37px] sm:-left-[45px] top-0 w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${bg} group-hover:scale-110 shadow-lg`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Event Card */}
              <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.event}</span>
                    {item.role && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {item.role}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {timeFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <span className="text-slate-400">Actor:</span>
                  <span className="text-white font-semibold">{item.actor}</span>
                </div>

                {item.details && (
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    {item.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
