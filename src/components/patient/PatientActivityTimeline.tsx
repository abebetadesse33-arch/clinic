"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Pill,
  FlaskConical,
  Activity,
  HeartPulse,
  User,
  ShieldCheck,
  Video,
  FileText,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Filter,
} from "lucide-react";

export interface PatientActivity {
  id: string;
  patientId: string;
  actorName: string;
  actorRole: string;
  activityType: string;
  title: string;
  description?: string | null;
  severity?: "info" | "warning" | "critical" | string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface PatientActivityTimelineProps {
  patientId: string;
  onViewDocument?: (fileUrl: string) => void;
}

export default function PatientActivityTimeline({
  patientId,
  onViewDocument,
}: PatientActivityTimelineProps) {
  const [activities, setActivities] = useState<PatientActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const fetchActivities = useCallback(async () => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/patients/${patientId}/activities`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setActivities(data.data);
      }
    } catch (err) {
      console.error("Failed to load patient activities:", err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "prescription_issued":
      case "medication_dispensed":
        return <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "lab_uploaded":
      case "lab_ordered":
        return <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "vitals_logged":
        return <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case "triage_performed":
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case "consultation_started":
      case "consultation_completed":
        return <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case "document_uploaded":
        return <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Calendar className="w-4 h-4 text-[#005C4B] dark:text-emerald-400" />;
    }
  };

  const filtered = activities.filter((act) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "prescriptions") return act.activityType.includes("prescription") || act.activityType.includes("medication");
    if (activeFilter === "labs") return act.activityType.includes("lab");
    if (activeFilter === "vitals") return act.activityType.includes("vitals");
    if (activeFilter === "consultations") return act.activityType.includes("consultation") || act.activityType.includes("appointment");
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 p-6 shadow-warm space-y-5 animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2EFE9] dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[#162E27] dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#005C4B]" />
              Patient Activity & Clinical Timeline
            </h3>
            <span className="badge-mint text-[10px] py-0.5 px-2">Immutable Audit</span>
          </div>
          <p className="text-xs text-[#687B74] dark:text-slate-400">
            Chronological audit of appointments, prescriptions, lab results, triage events, and care interactions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Events" },
            { id: "prescriptions", label: "Prescriptions" },
            { id: "labs", label: "Labs & Tests" },
            { id: "vitals", label: "Vitals" },
            { id: "consultations", label: "Visits & Consults" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === f.id
                  ? "bg-[#005C4B] text-white shadow-xs"
                  : "bg-[#FAF8F5] dark:bg-slate-800 text-[#33413C] dark:text-slate-300 border border-[#E7E2D8] dark:border-slate-700 hover:bg-[#E8F4F0]"
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            onClick={fetchActivities}
            className="p-1.5 rounded-full border border-[#E7E2D8] dark:border-slate-700 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 text-[#687B74] dark:text-slate-300"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#005C4B]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#687B74] dark:text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto text-[#005C4B] animate-spin" />
          <p>Loading chronological activity records...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E2D8] dark:before:bg-slate-800">
          {filtered.map((item) => (
            <div key={item.id} className="relative group">
              {/* Bullet Node */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#005C4B] dark:border-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                <div className="w-2 h-2 rounded-full bg-[#005C4B] dark:bg-emerald-400" />
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-950 border border-[#E7E2D8] dark:border-slate-800 hover:border-[#005C4B]/40 transition-all space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-[#E7E2D8] dark:border-slate-700 flex items-center justify-center">
                      {getActivityIcon(item.activityType)}
                    </div>
                    <span className="font-bold text-xs text-[#162E27] dark:text-white">
                      {item.title}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#687B74] dark:text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-[#687B74] dark:text-slate-300 pl-9">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#E7E2D8]/60 dark:border-slate-800 pl-9">
                  <span className="text-[#687B74] dark:text-slate-400 flex items-center gap-1">
                    Logged by: <strong className="text-[#162E27] dark:text-slate-200">{item.actorName}</strong> ({item.actorRole})
                  </span>

                  {item.metadata?.documentUrl && (
                    <button
                      onClick={() => onViewDocument && onViewDocument(item.metadata?.documentUrl)}
                      className="text-[#005C4B] dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>View Record</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-[#687B74] dark:text-slate-400">
          No activity records found for the selected category.
        </div>
      )}
    </div>
  );
}
