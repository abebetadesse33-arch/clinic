"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { Activity, Plus, ChevronRight, TrendingUp } from "lucide-react";

const BERG_ITEMS = [
  { id: 1, description: "Sitting to standing", maxScore: 4, score: 2 },
  { id: 2, description: "Standing unsupported", maxScore: 4, score: 3 },
  { id: 3, description: "Sitting unsupported", maxScore: 4, score: 4 },
  { id: 4, description: "Standing to sitting", maxScore: 4, score: 3 },
  { id: 5, description: "Transfers", maxScore: 4, score: 2 },
  { id: 6, description: "Standing with eyes closed", maxScore: 4, score: 2 },
  { id: 7, description: "Standing with feet together", maxScore: 4, score: 2 },
  { id: 8, description: "Reaching forward", maxScore: 4, score: 2 },
  { id: 9, description: "Retrieving object from floor", maxScore: 4, score: 1 },
  { id: 10, description: "Turning to look behind", maxScore: 4, score: 2 },
  { id: 11, description: "Turning 360 degrees", maxScore: 4, score: 1 },
  { id: 12, description: "Placing alternate foot on step", maxScore: 4, score: 2 },
  { id: 13, description: "Standing with one foot in front", maxScore: 4, score: 1 },
  { id: 14, description: "Standing on one foot", maxScore: 4, score: 1 },
];

const EXERCISE_PROGRAM = [
  { phase: "Week 1-2", focus: "Bed mobility & sit-to-stand", frequency: "2×/day", duration: "15 min" },
  { phase: "Week 3-4", focus: "Supervised ambulation 50m", frequency: "3×/day", duration: "20 min" },
  { phase: "Week 5-6", focus: "Stair training & balance work", frequency: "2×/day", duration: "30 min" },
];

export default function PhysiotherapyRehabWidget({ title }: WidgetProps) {
  const [bergScores, setBergScores] = useState<number[]>(BERG_ITEMS.map((i) => i.score));

  const totalBerg = bergScores.reduce((a, b) => a + b, 0);
  const fallRisk = totalBerg <= 20 ? "High" : totalBerg <= 40 ? "Moderate" : "Low";
  const riskColor = totalBerg <= 20 ? "text-red-400" : totalBerg <= 40 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-green-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className={`text-xs font-semibold ${riskColor}`}>Fall Risk: {fallRisk}</span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-3">
        {/* Berg Balance Score */}
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-300">Berg Balance Scale</span>
            <div className="flex items-center gap-1">
              <span className={`text-2xl font-bold ${riskColor}`}>{totalBerg}</span>
              <span className="text-xs text-white/40">/56</span>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${totalBerg <= 20 ? "bg-red-400" : totalBerg <= 40 ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ width: `${(totalBerg / 56) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto">
            {BERG_ITEMS.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-[10px]">
                <span className="text-white/40 truncate w-24">{item.description}</span>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((v) => (
                    <button
                      key={v}
                      onClick={() => setBergScores((prev) => { const n = [...prev]; n[idx] = v; return n; })}
                      className={`w-4 h-4 rounded text-[8px] ${bergScores[idx] === v ? "bg-green-500 text-white" : "bg-white/5 text-white/30"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exercise Program */}
        <div className="p-3 rounded-lg border border-white/8 bg-white/3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-green-400" />
            <span className="text-xs font-semibold text-green-300">Progressive Exercise Program</span>
          </div>
          {EXERCISE_PROGRAM.map((phase) => (
            <div key={phase.phase} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-xs font-medium text-white/60 w-20 flex-shrink-0">{phase.phase}</span>
              <div className="flex-1">
                <span className="text-xs text-white">{phase.focus}</span>
                <div className="text-[10px] text-white/40 mt-0.5">{phase.frequency} · {phase.duration}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
