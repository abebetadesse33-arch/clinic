"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { Home, Bus, Utensils, Briefcase, Heart, CheckCircle, XCircle, Clock } from "lucide-react";

const SDOH_DOMAINS = [
  {
    id: "housing",
    domain: "Housing Stability",
    icon: Home,
    status: "at_risk" as const,
    score: 2,
    maxScore: 5,
    detail: "Unstable housing — at risk of eviction within 30 days",
    actions: [
      { label: "Section 8 Application", status: "in_progress" as const },
      { label: "Emergency Housing Referral", status: "pending" as const },
    ],
  },
  {
    id: "food",
    domain: "Food Security",
    icon: Utensils,
    status: "at_risk" as const,
    score: 2,
    maxScore: 5,
    detail: "Food desert ZIP code — limited grocery access within 2 miles",
    actions: [
      { label: "SNAP Enrollment", status: "completed" as const },
      { label: "Food Bank Connection", status: "completed" as const },
    ],
  },
  {
    id: "transport",
    domain: "Transportation",
    icon: Bus,
    status: "barrier" as const,
    score: 1,
    maxScore: 5,
    detail: "No personal vehicle — limited bus access for medical appointments",
    actions: [
      { label: "Medicaid Transport Benefit", status: "in_progress" as const },
      { label: "Volunteer Driver Program", status: "pending" as const },
    ],
  },
  {
    id: "employment",
    domain: "Employment & Income",
    icon: Briefcase,
    status: "moderate" as const,
    score: 3,
    maxScore: 5,
    detail: "Part-time employment — $18,400/year income, no employer insurance",
    actions: [
      { label: "Medicaid Eligibility Review", status: "completed" as const },
    ],
  },
  {
    id: "social",
    domain: "Social Support",
    icon: Heart,
    status: "moderate" as const,
    score: 3,
    maxScore: 5,
    detail: "Limited support network — lives alone, daughter visits weekly",
    actions: [
      { label: "Peer Support Group Referral", status: "pending" as const },
    ],
  },
];

const STATUS_STYLES = {
  at_risk: "text-red-400 bg-red-500/15 border-red-500/30",
  barrier: "text-red-400 bg-red-500/10 border-red-500/25",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  good: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
};

const ACTION_ICONS = {
  completed: CheckCircle,
  in_progress: Clock,
  pending: XCircle,
};

const ACTION_COLORS = {
  completed: "text-emerald-400",
  in_progress: "text-amber-400",
  pending: "text-white/30",
};

export default function SdohMatrixWidget({ title }: WidgetProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const overallScore = Math.round(
    SDOH_DOMAINS.reduce((acc, d) => acc + d.score, 0) / SDOH_DOMAINS.length
  );

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Home size={16} className="text-pink-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className={`text-xs font-semibold ${overallScore <= 2 ? "text-red-400" : overallScore <= 3 ? "text-amber-400" : "text-emerald-400"}`}>
          SDOH Index: {overallScore}/5
        </span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {SDOH_DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const styles = STATUS_STYLES[domain.status];
          const isExpanded = expanded === domain.id;

          return (
            <div key={domain.id} className={`rounded-lg border ${styles} transition-all`}>
              <button
                className="w-full p-3 text-left"
                onClick={() => setExpanded(isExpanded ? null : domain.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} />
                    <span className="text-sm font-medium text-white">{domain.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Score dots */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <div
                          key={v}
                          className={`w-2 h-2 rounded-full ${v <= domain.score ? (domain.score <= 2 ? "bg-red-400" : domain.score <= 3 ? "bg-amber-400" : "bg-emerald-400") : "bg-white/10"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-white/30">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs text-white/60">{domain.detail}</p>
                  <div className="space-y-1">
                    {domain.actions.map((action) => {
                      const ActionIcon = ACTION_ICONS[action.status];
                      return (
                        <div key={action.label} className="flex items-center gap-2">
                          <ActionIcon size={11} className={ACTION_COLORS[action.status]} />
                          <span className="text-xs text-white/70">{action.label}</span>
                          <span className={`text-[10px] ml-auto ${ACTION_COLORS[action.status]}`}>
                            {action.status.replace("_", " ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
