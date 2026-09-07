"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { Brain, TrendingDown, TrendingUp, MessageSquare } from "lucide-react";

const PHQ9_SCORES = [
  { date: "2026-06", score: 18, label: "Jun" },
  { date: "2026-07", score: 14, label: "Jul" },
  { date: "2026-08-01", score: 11, label: "Aug 1" },
  { date: "2026-08-15", score: 9, label: "Aug 15" },
  { date: "2026-08-24", score: 7, label: "Today" },
];

const GAD7_SCORES = [
  { date: "2026-06", score: 16, label: "Jun" },
  { date: "2026-07", score: 13, label: "Jul" },
  { date: "2026-08-01", score: 10, label: "Aug 1" },
  { date: "2026-08-15", score: 8, label: "Aug 15" },
  { date: "2026-08-24", score: 6, label: "Today" },
];

const PHQ9_SEVERITY = (score: number) =>
  score >= 20 ? "Severe" : score >= 15 ? "Moderately Severe" : score >= 10 ? "Moderate" : score >= 5 ? "Mild" : "Minimal";

const GAD7_SEVERITY = (score: number) =>
  score >= 15 ? "Severe" : score >= 10 ? "Moderate" : score >= 5 ? "Mild" : "Minimal";

const CBT_DIRECTIVES = [
  "Behavioral Activation: 3× 15-min walk/week (cardio-mood dual benefit)",
  "Cognitive Restructuring: target health-catastrophizing thought patterns",
  "Relaxation Protocol: 4-7-8 breathing before glucose checks",
  "Sleep hygiene: consistent 10pm bedtime + light avoidance post-8pm",
  "Gratitude journaling 3 items/evening",
  "Mindfulness-Based Stress Reduction (MBSR) referral — 8-week program",
];

export default function PsychometricsWidget({ title }: WidgetProps) {
  const [activeChart, setActiveChart] = useState<"phq9" | "gad7">("phq9");

  const scores = activeChart === "phq9" ? PHQ9_SCORES : GAD7_SCORES;
  const currentScore = scores[scores.length - 1].score;
  const prevScore = scores[scores.length - 2].score;
  const trend = currentScore < prevScore ? "improving" : currentScore > prevScore ? "worsening" : "stable";
  const severity = activeChart === "phq9" ? PHQ9_SEVERITY(currentScore) : GAD7_SEVERITY(currentScore);
  const maxScore = activeChart === "phq9" ? 27 : 21;

  const barHeight = (score: number) => `${(score / maxScore) * 100}%`;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <span className="widget-title">{title}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveChart("phq9")}
            className={`text-xs px-2 py-0.5 rounded ${activeChart === "phq9" ? "bg-violet-500/25 text-violet-300" : "text-white/40"}`}
          >
            PHQ-9
          </button>
          <button
            onClick={() => setActiveChart("gad7")}
            className={`text-xs px-2 py-0.5 rounded ${activeChart === "gad7" ? "bg-blue-500/25 text-blue-300" : "text-white/40"}`}
          >
            GAD-7
          </button>
        </div>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-3">
        {/* Score summary */}
        <div className="flex items-center gap-4 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
          <div>
            <div className="text-4xl font-bold text-white">{currentScore}</div>
            <div className="text-xs text-white/40">/{maxScore}</div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{severity}</div>
            <div className={`flex items-center gap-1 text-xs mt-0.5 ${
              trend === "improving" ? "text-emerald-400" : trend === "worsening" ? "text-red-400" : "text-white/40"
            }`}>
              {trend === "improving" ? <TrendingDown size={12} /> : trend === "worsening" ? <TrendingUp size={12} /> : null}
              {trend === "improving" ? `↓${prevScore - currentScore} pts from last` : trend === "worsening" ? `↑${currentScore - prevScore} pts from last` : "Stable"}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="h-24 flex items-end gap-1 px-1">
          {scores.map((s, i) => (
            <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[9px] text-white/40">{s.score}</div>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: barHeight(s.score),
                  background: i === scores.length - 1
                    ? "linear-gradient(180deg, #8b5cf6, #6d28d9)"
                    : "rgba(139,92,246,0.25)",
                }}
              />
              <div className="text-[9px] text-white/30 whitespace-nowrap">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CBT Directives */}
        <div className="p-2 rounded-lg border border-white/8 bg-white/3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={12} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">CBT Directives</span>
          </div>
          {CBT_DIRECTIVES.map((directive, i) => (
            <div key={i} className="flex items-start gap-1.5 py-0.5">
              <span className="text-violet-400/50 text-xs flex-shrink-0">•</span>
              <span className="text-xs text-white/60">{directive}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
