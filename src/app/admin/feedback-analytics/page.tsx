"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useTranslation } from "@/lib/i18n/translations";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  User,
  Building2,
  Clock,
  ShieldAlert,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Check,
  Send,
  Sliders,
  Layers,
} from "lucide-react";

export default function FeedbackAnalyticsPage() {
  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin", "physician", "nurse", "auditor"]}
      fallbackTitle="Feedback Intelligence Center"
      fallbackMessage="Access restricted to Clinical Quality and Administrative Personnel."
    >
      <FeedbackAnalyticsContent />
    </RoleGuard>
  );
}

function FeedbackAnalyticsContent() {
  const { t } = useTranslation();
  const [digest, setDigest] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // New feedback manual test submit
  const [testText, setTestText] = useState("");
  const [testDept, setTestDept] = useState("Outpatient");
  const [testRating, setTestRating] = useState(4);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resDigest, resList] = await Promise.all([
        fetch("/api/v1/feedback/digest"),
        fetch("/api/v1/feedback"),
      ]);
      const dataDigest = await resDigest.json();
      const dataList = await resList.json();

      if (dataDigest.success) setDigest(dataDigest.data);
      if (dataList.success) setFeedbacks(dataList.data.records);
    } catch (err) {
      console.error("Load feedback error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackText: testText,
          department: testDept,
          rating: testRating,
          submitterType: "patient",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestText("");
        loadData();
      }
    } catch (err) {
      console.error("Submit test feedback error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResolveAction = async (id: string, status: string) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          resolutionStatus: status,
          resolutionNotes: resolutionNote || "Action executed by clinical administrator.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFeedback(null);
        setResolutionNote("");
        loadData();
      }
    } catch (err) {
      console.error("Resolve action error:", err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchSearch =
      searchQuery === "" ||
      f.feedbackText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.department && f.department.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchSentiment = sentimentFilter === "all" || f.sentiment === sentimentFilter;
    const matchUrgency = urgencyFilter === "all" || f.urgencyLevel === urgencyFilter;
    return matchSearch && matchSentiment && matchUrgency;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {t("feedback.title", "AI Feedback Intelligence & Sentiment Center")}
            </h1>
            <p className="text-xs text-slate-500">
              {t("feedback.subtitle", "NLP Theme Extraction, Patient Sentiment Ratios & Operational Action Backlog")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{t("common.refresh", "Refresh Analytics")}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {digest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Total Submissions</span>
              <MessageSquare className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{digest.kpis.totalFeedback}</p>
            <p className="text-[10px] text-slate-500 mt-1">Processed by NLP pipeline</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1">
              <span>Positive Sentiment</span>
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {digest.kpis.positiveCount}
            </p>
            <p className="text-[10px] text-emerald-600/80 mt-1">
              {digest.kpis.totalFeedback > 0
                ? `${Math.round((digest.kpis.positiveCount / digest.kpis.totalFeedback) * 100)}% satisfaction ratio`
                : "No data"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 mb-1">
              <span>Negative / Critical</span>
              <ThumbsDown className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300">
              {digest.kpis.negativeCount}
            </p>
            <p className="text-[10px] text-rose-600/80 mt-1">Requiring operational review</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-1">
              <span>Safety Hazard Alerts</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {digest.kpis.safetyHazardsCount}
            </p>
            <p className="text-[10px] text-amber-600/80 mt-1">Auto-escalated for audit</p>
          </div>
        </div>
      )}

      {/* Top Themes & Interactive Feedback Submission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Operational Themes */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-500" />
            Top Extracted Operational Themes & Friction Points
          </h2>

          {digest && digest.topThemes && digest.topThemes.length > 0 ? (
            <div className="space-y-3">
              {digest.topThemes.map((item: any) => {
                const totalThemes = digest.kpis.totalFeedback || 1;
                const pct = Math.min(100, Math.round((item.count / totalThemes) * 100));
                return (
                  <div key={item.theme} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                        {item.theme.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="text-emerald-500 font-bold">+{item.positiveCount}</span>
                        <span className="text-rose-500 font-bold">-{item.negativeCount}</span>
                        <span>({item.count} mentions)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(item.positiveCount / (item.count || 1)) * pct}%` }}
                      />
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(item.negativeCount / (item.count || 1)) * pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-6">No themes extracted yet.</p>
          )}
        </div>

        {/* Live Feedback Ingestion & NLP Tester */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-500" />
            Ingest & Run NLP Analysis
          </h2>
          <form onSubmit={handleTestSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Department</label>
              <select
                value={testDept}
                onChange={(e) => setTestDept(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Triage & Emergency">Triage & Emergency</option>
                <option value="Outpatient Consultation">Outpatient Consultation</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Inpatient Ward">Inpatient Ward</option>
                <option value="Billing & Cashier">Billing & Cashier</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Patient Rating</label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTestRating(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      testRating === r
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {r} ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Feedback Narrative</label>
              <textarea
                rows={3}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="e.g. The doctor was very patient, but we waited 45 minutes at the pharmacy counter..."
                className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAnalyzing || !testText.trim()}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing with NLP…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Submit to NLP Pipeline
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Filterable Feedback Record Stream */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-500" />
            Analyzed Feedback Stream ({filteredFeedbacks.length})
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search feedback…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Urgency Levels</option>
              <option value="normal">Normal</option>
              <option value="elevated">Elevated</option>
              <option value="critical_safety">Critical Safety</option>
            </select>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-3">
          {filteredFeedbacks.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No feedback records matching criteria.</p>
          ) : (
            filteredFeedbacks.map((f) => (
              <div
                key={f.id}
                className={`p-4 rounded-2xl border transition-all ${
                  f.isSafetyHazard
                    ? "bg-rose-500/5 border-rose-500/30"
                    : f.sentiment === "positive"
                    ? "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-teal-500/30"
                    : "bg-amber-500/5 border-amber-500/30"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {f.submitterName || "Patient"}
                      </span>
                      <span className="text-[10px] text-slate-400">• {f.department}</span>
                      <span className="text-[10px] text-amber-500 font-bold">{"★".repeat(f.rating || 3)}</span>

                      {/* Sentiment Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          f.sentiment === "positive"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : f.sentiment === "negative"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {f.sentiment} ({f.sentimentScore})
                      </span>

                      {f.isSafetyHazard && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Safety Hazard
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          f.resolutionStatus === "open"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        }`}
                      >
                        {f.resolutionStatus.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      "{f.feedbackText}"
                    </p>

                    {/* Extracted Themes Chips */}
                    {f.extractedThemes && (f.extractedThemes as string[]).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold">Themes:</span>
                        {(f.extractedThemes as string[]).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Recommendations Preview */}
                    {f.actionRecommendations && (f.actionRecommendations as any[]).length > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 text-xs space-y-1">
                        <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Recommended Administrative Action:
                        </p>
                        {(f.actionRecommendations as any[]).map((rec, i) => (
                          <p key={i} className="text-slate-700 dark:text-slate-300 text-[11px]">
                            • <strong>[{rec.department}]</strong> {rec.action}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                    {f.resolutionStatus === "open" && (
                      <button
                        onClick={() => setSelectedFeedback(f)}
                        className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-colors"
                      >
                        Take Action
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Execute Administrative Resolution
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Feedback: "{selectedFeedback.feedbackText}"
            </p>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Action Taken / Note</label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe operational changes or clinical adjustments made..."
                className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAction(selectedFeedback.id, "action_taken")}
                disabled={isSubmittingAction}
                className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all"
              >
                Mark Action Executed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
