"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Stethoscope, AlertTriangle, CheckCircle2, Clock, Search,
  Filter, ChevronRight, User, Sparkles, Activity, Mic,
  FileText, Image, Video, RefreshCw, Loader2, Shield,
  UserCheck, Brain, ArrowRight, Bell, TrendingUp, Calendar,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CaseItem {
  caseId: string;
  patient: { fullName: string; age: number; gender: string; mrn: string };
  complaint: { chiefComplaint: string; severity: string; seekingUrgent: boolean; duration: string };
  symptoms: { painScale: number; selectedCategories: string[] };
  filesCount?: number;
  fileNames?: string[];
  assignedHandler: string;
  handlerId: string;
  status: string;
  submittedAt: string;
  aiAnalysis?: {
    summary: string;
    urgencyLevel: string;
    potentialCauses: string[];
    criticalAlerts: { level: string; message: string }[];
    analysisConfidence: number;
  } | null;
}

// ─── Status Metadata ────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending_ai_analysis: { label: "AI Analyzing", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", dot: "bg-amber-400 animate-pulse" },
  ai_analyzed: { label: "Ready for Review", color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/30", dot: "bg-teal-400" },
  under_review: { label: "Under Review", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", dot: "bg-blue-400" },
  awaiting_tests: { label: "Awaiting Tests", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30", dot: "bg-violet-400" },
  escalated: { label: "Escalated", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", dot: "bg-red-400 animate-pulse" },
  resolved: { label: "Resolved", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30", dot: "bg-slate-500" },
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "text-green-400 border-green-500/30 bg-green-500/10",
  moderate: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  severe: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  very_severe: "text-red-400 border-red-500/30 bg-red-500/10",
};

const URGENCY_COLORS: Record<string, string> = {
  routine: "text-slate-400",
  moderate: "text-amber-400",
  urgent: "text-orange-400",
  critical: "text-red-400",
};

// ─── Case Card ───────────────────────────────────────────────────────────────

function CaseCard({
  c,
  onStatusChange,
}: {
  c: CaseItem;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const statusMeta = STATUS_META[c.status] || STATUS_META.pending_ai_analysis;
  const timeAgo = (() => {
    const diff = Date.now() - new Date(c.submittedAt || Date.now()).getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  })();

  const patientName = c.patient?.fullName || "Patient";
  const patientInitial = patientName.charAt(0) || "P";
  const patientMrn = c.patient?.mrn || "MRN-ACTIVE";
  const patientAge = c.patient?.age || 35;
  const patientGender = c.patient?.gender || "undisclosed";
  const chiefComplaint = c.complaint?.chiefComplaint || "Clinical Case";
  const severity = c.complaint?.severity || "moderate";
  const duration = c.complaint?.duration || "Recent";
  const painScale = c.symptoms?.painScale || 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 rounded-2xl p-5 transition-all hover:shadow-xl hover:shadow-teal-900/10 hover:-translate-y-0.5 flex flex-col justify-between">
      <Link href={`/cases/${c.caseId}`} className="block group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {patientInitial}
            </div>
            <div>
              <div className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">{patientName}</div>
              <div className="text-[10px] text-slate-500 font-mono">{patientMrn} · {patientAge}y {patientGender}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {c.complaint?.seekingUrgent && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> URGENT
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 ${statusMeta.bg} ${statusMeta.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
          {chiefComplaint}
        </p>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold capitalize ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.moderate}`}>
            {severity.replace("_", " ")}
          </span>
          <span className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-400">
            <Clock className="w-2.5 h-2.5 inline mr-1" />{duration}
          </span>
          <span className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-400">
            Pain: {painScale}/10
          </span>
          {(c.filesCount || 0) > 0 && (
            <span className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-violet-400">
              📎 {c.filesCount} file{(c.filesCount || 0) > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {c.aiAnalysis ? (
          <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-1.5 text-indigo-300 text-[10px] font-bold mb-1.5">
              <Sparkles className="w-3 h-3" /> AI Analysis · {c.aiAnalysis.analysisConfidence || 85}% confidence
              <span className={`ml-auto font-bold ${URGENCY_COLORS[c.aiAnalysis.urgencyLevel] || "text-slate-400"}`}>
                {c.aiAnalysis.urgencyLevel?.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{c.aiAnalysis.summary}</p>
            {c.aiAnalysis.criticalAlerts?.some((a) => a.level === "critical") && (
              <div className="mt-2 flex items-start gap-1.5 text-red-400">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold">
                  {c.aiAnalysis.criticalAlerts.find((a) => a.level === "critical")?.message}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>AI analysis in progress...</span>
            </div>
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[10px]">
        <span className="text-slate-500">Submitted {timeAgo}</span>
        <div className="flex items-center gap-2">
          {c.status !== "under_review" && (
            <button
              onClick={() => onStatusChange?.(c.caseId, "under_review")}
              className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold transition-all"
            >
              Take Case
            </button>
          )}
          {c.status === "under_review" && (
            <button
              onClick={() => onStatusChange?.(c.caseId, "resolved")}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold transition-all"
            >
              Resolve ✓
            </button>
          )}
          <Link
            href={`/cases/${c.caseId}`}
            className="flex items-center gap-1 text-slate-400 hover:text-white font-semibold transition-colors ml-1"
          >
            Details <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CasesPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician", "nurse_practitioner", "nurse", "care_coordinator",
        "system_admin", "tenant_admin", "auditor",
      ]}
      fallbackTitle="Case Handler Dashboard"
      fallbackMessage="Access to patient case submissions and AI-assisted triage is restricted to licensed healthcare providers and care coordinators."
    >
      <CasesDashboardContent />
    </RoleGuard>
  );
}

function CasesDashboardContent() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "urgent" | "pending" | "reviewed">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, urgent: 0, aiReady: 0, resolved: 0 });

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/cases?limit=100");
      const data = await res.json();
      if (data.success && data.data?.cases) {
        const all = data.data.cases as CaseItem[];
        setCases(all);
        setStats({
          total: all.length,
          urgent: all.filter((c) => c.complaint?.seekingUrgent).length,
          aiReady: all.filter((c) => c.status === "ai_analyzed" || c.status === "pending_ai_analysis").length,
          resolved: all.filter((c) => c.status === "resolved").length,
        });
      }
    } catch {
      setCases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleUpdateStatus = async (caseId: string, newStatus: string) => {
    try {
      await fetch(`/api/v1/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCases();
    } catch (e) {
      console.error("Status update error:", e);
    }
  };

  const handleBulkMarkReviewed = async () => {
    const pendingCases = cases.filter(
      (c) => c.status === "pending_ai_analysis" || c.status === "ai_analyzed"
    );
    for (const c of pendingCases) {
      try {
        await fetch(`/api/v1/cases/${c.caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "under_review", handlerNote: "Bulk accepted for specialist review." }),
        });
      } catch { }
    }
    fetchCases();
  };

  const filtered = cases.filter((c) => {
    const pName = c.patient?.fullName || "";
    const pMrn = c.patient?.mrn || "";
    const cId = c.caseId || "";
    const cComplaint = c.complaint?.chiefComplaint || "";
    const searchLower = search.toLowerCase();

    const matchSearch =
      !search ||
      pName.toLowerCase().includes(searchLower) ||
      pMrn.toLowerCase().includes(searchLower) ||
      cId.toLowerCase().includes(searchLower) ||
      cComplaint.toLowerCase().includes(searchLower);

    const matchFilter =
      activeFilter === "all" ||
      (activeFilter === "urgent" && Boolean(c.complaint?.seekingUrgent)) ||
      (activeFilter === "pending" && (c.status === "pending_ai_analysis" || c.status === "ai_analyzed")) ||
      (activeFilter === "reviewed" && (c.status === "under_review" || c.status === "resolved"));

    return matchSearch && matchFilter;
  });

  const kanbanColumns = [
    { id: "pending_ai_analysis", title: "Pending AI Analysis", color: "text-amber-400", filter: (c: CaseItem) => c.status === "pending_ai_analysis" || c.status === "ai_analyzed" },
    { id: "under_review", title: "Under Review", color: "text-teal-400", filter: (c: CaseItem) => c.status === "under_review" },
    { id: "active", title: "Active Diagnostics", color: "text-sky-400", filter: (c: CaseItem) => c.status === "active" || c.status === "awaiting_tests" || c.status === "escalated" },
    { id: "resolved", title: "Resolved Cases", color: "text-emerald-400", filter: (c: CaseItem) => c.status === "resolved" || c.status === "closed" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Case Handler Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Dynamic clinical triage & Kanban management · Real PostgreSQL Backend</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkMarkReviewed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-bold transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Pending as Reviewed
          </button>
          <button onClick={fetchCases} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/patient/submit-case"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 text-xs font-bold transition-all shadow-md"
          >
            <User className="w-3.5 h-3.5" /> Submit Case
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Cases", value: stats.total || cases.length, icon: FileText, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
          { label: "Urgent / Critical", value: stats.urgent || cases.filter((c) => c.complaint?.seekingUrgent).length, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          { label: "AI-Ready for Review", value: stats.aiReady, icon: Sparkles, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`p-4 rounded-2xl border ${bg}`}>
            <div className={`${color} mb-2`}><Icon className="w-5 h-5" /></div>
            <div className="text-2xl font-extrabold text-white">{value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Search, Filter & View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
            placeholder="Search by patient name, MRN, case ID, or complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban" ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid" ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Cases View */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading cases & AI analyses from database...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
          <CheckCircle2 className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400 font-medium">No cases match the filter</p>
          <p className="text-xs text-slate-600 mt-1">
            {search ? "Try a different search query" : "New patient submissions will appear here live"}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colCases = filtered.filter(col.filter);
            return (
              <div key={col.id} className="bg-slate-950/60 border border-slate-800 rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                    {colCases.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                  {colCases.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-600 italic">No cases in this column</div>
                  ) : (
                    colCases.map((c) => (
                      <CaseCard key={c.caseId} c={c} onStatusChange={handleUpdateStatus} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <CaseCard key={c.caseId} c={c} onStatusChange={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

