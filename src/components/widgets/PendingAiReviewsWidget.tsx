"use client";

import React from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Brain, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

export default function PendingAiReviewsWidget({ title }: WidgetProps) {
  const { aiSuggestions, selectedPatient, updateAISuggestionStatus } = useClinic();

  const pending = aiSuggestions.filter((s) => s.status === "pending_review");

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className={`widget-badge ${pending.length > 0 ? "widget-badge-alert" : ""}`}>
          {pending.length} pending
        </span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-3">
        {pending.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-white/30">
            <CheckCircle size={24} className="mb-2 text-emerald-400/50" />
            <span className="text-xs">All AI reviews complete</span>
          </div>
        )}

        {pending.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">
                    {suggestion.analysisType}
                  </span>
                  <span className="text-xs text-white/40">
                    <Clock size={10} className="inline mr-0.5" />
                    {new Date(suggestion.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-1 line-clamp-2">
                  {suggestion.aiResponse.patientSummaryInsight}
                </p>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {suggestion.aiResponse.redFlagsUrgentAlerts.slice(0, 2).map((flag, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/20"
                    >
                      <AlertTriangle size={9} className="inline mr-0.5" />
                      {flag.substring(0, 40)}…
                    </span>
                  ))}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  AI Confidence: {suggestion.aiResponse.aiConfidenceIndex?.toFixed(1) ?? "—"}%
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1 border-t border-white/5">
              <button
                onClick={() => updateAISuggestionStatus(suggestion.id, "accepted_full")}
                className="flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors"
              >
                <CheckCircle size={12} />
                Accept
              </button>
              <button
                onClick={() => updateAISuggestionStatus(suggestion.id, "accepted_modified")}
                className="flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
              >
                Modify
              </button>
              <button
                onClick={() => updateAISuggestionStatus(suggestion.id, "rejected")}
                className="flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition-colors"
              >
                <XCircle size={12} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
