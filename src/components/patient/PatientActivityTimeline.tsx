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
    if (activeFilter === "triage") return act.activityType.includes("triage");
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
            { id: "triage", label: "Triage" },
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
            <TimelineItem
              key={item.id}
              item={item}
              icon={getActivityIcon(item.activityType)}
              onViewDocument={onViewDocument}
            />
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

function TimelineItem({
  item,
  icon,
  onViewDocument,
}: {
  item: PatientActivity;
  icon: React.ReactNode;
  onViewDocument?: (fileUrl: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDocument = !!item.metadata?.documentUrl;
  const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0;
  const hasDetails = !!item.description || !!hasMetadata;

  const severityBorderClass =
    item.severity === "critical"
      ? "border-rose-200 dark:border-rose-800"
      : item.severity === "warning"
      ? "border-amber-200 dark:border-amber-800"
      : "border-[#E7E2D8] dark:border-slate-800";

  return (
    <div className="relative group">
      {/* Bullet Node */}
      <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#005C4B] dark:border-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
        <div className="w-2 h-2 rounded-full bg-[#005C4B] dark:bg-emerald-400" />
      </div>

      {/* Event Card */}
      <div className={`p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-950 border ${severityBorderClass} hover:border-[#005C4B]/40 transition-all space-y-2`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-[#E7E2D8] dark:border-slate-700 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <span className="font-bold text-xs text-[#162E27] dark:text-white">
              {item.title}
            </span>
            {item.severity === "critical" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                CRITICAL
              </span>
            )}
            {item.severity === "warning" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                WARNING
              </span>
            )}
          </div>

          <span className="text-[11px] text-[#687B74] dark:text-slate-400 font-mono flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {new Date(item.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Expanded Metadata Details */}
        {expanded && hasDetails && (
          <div className="pl-9 pt-2 space-y-1.5 border-t border-[#E7E2D8]/50 dark:border-slate-800">
            {item.description && (
              <p className="text-xs text-[#687B74] dark:text-slate-300">
                {item.description}
              </p>
            )}
            {hasMetadata && Object.entries(item.metadata!).map(([key, val]) => {
              if (key === "documentUrl") return null;
              return (
                <div key={key} className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#687B74] dark:text-slate-500 font-mono uppercase w-28 shrink-0">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="text-[#162E27] dark:text-slate-300 font-medium break-all">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#E7E2D8]/60 dark:border-slate-800 pl-9">
          <span className="text-[#687B74] dark:text-slate-400 flex items-center gap-1">
            Logged by:{" "}
            <strong className="text-[#162E27] dark:text-slate-200 ml-1">{item.actorName}</strong>
            <span className="ml-1">({item.actorRole})</span>
          </span>

          <div className="flex items-center gap-3">
            {/* View Details toggle — for items without a document */}
            {hasDetails && !hasDocument && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="text-[#005C4B] dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5 transition-colors"
              >
                <span>{expanded ? "Hide Details" : "View Details"}</span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
                />
              </button>
            )}

            {/* View Record — opens document viewer via prop, or new tab fallback */}
            {hasDocument && (
              <button
                onClick={() => {
                  if (onViewDocument) {
                    onViewDocument(item.metadata!.documentUrl);
                  } else {
                    window.open(item.metadata!.documentUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                className="text-[#005C4B] dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5 transition-colors"
              >
                <span>View Record</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            {/* Show expand toggle even when document exists */}
            {hasDetails && hasDocument && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="text-slate-500 dark:text-slate-400 font-bold hover:underline flex items-center gap-0.5 text-[10px]"
              >
                {expanded ? "Less" : "Details"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

