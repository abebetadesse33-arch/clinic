"use client";

import React from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { Wind, AlertTriangle, CheckCircle } from "lucide-react";

const ABG_RESULT = {
  pH: 7.38,
  pCO2: 38,
  pO2: 78,
  HCO3: 23,
  SpO2: 94,
  FiO2: 0.28,
  BE: -1,
  timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
};

const VENTILATOR_SETTINGS = {
  mode: "High-Flow Nasal Cannula",
  flow: "6 L/min",
  FiO2: "28%",
  PEEP: "N/A",
  note: "Titrate FiO₂ to maintain SpO₂ 92-96% (target for CKD patient)",
};

function interpretABG(abg: typeof ABG_RESULT) {
  const issues: Array<{ label: string; type: "normal" | "abnormal" | "warning" }> = [];

  if (abg.pH < 7.35) issues.push({ label: "Acidemia (pH < 7.35)", type: "abnormal" });
  else if (abg.pH > 7.45) issues.push({ label: "Alkalemia (pH > 7.45)", type: "abnormal" });
  else issues.push({ label: "pH within normal limits (7.35-7.45)", type: "normal" });

  if (abg.pCO2 > 45) issues.push({ label: `Hypercapnia (pCO₂ ${abg.pCO2} mmHg)`, type: "abnormal" });
  else if (abg.pCO2 < 35) issues.push({ label: `Hypocapnia (pCO₂ ${abg.pCO2} mmHg)`, type: "warning" });
  else issues.push({ label: `pCO₂ normal (${abg.pCO2} mmHg)`, type: "normal" });

  if (abg.pO2 < 80) issues.push({ label: `Hypoxemia (pO₂ ${abg.pO2} mmHg — mild)`, type: "warning" });
  else issues.push({ label: `pO₂ adequate (${abg.pO2} mmHg)`, type: "normal" });

  if (abg.SpO2 < 92) issues.push({ label: `SpO₂ below target (${abg.SpO2}%)`, type: "abnormal" });
  else issues.push({ label: `SpO₂ ${abg.SpO2}% — within 92-96% target`, type: "normal" });

  return issues;
}

export default function AbgAnalysisWidget({ title }: WidgetProps) {
  const interpretation = interpretABG(ABG_RESULT);

  const ABG_METRICS = [
    { label: "pH", value: ABG_RESULT.pH, normal: "7.35-7.45", flagged: ABG_RESULT.pH < 7.35 || ABG_RESULT.pH > 7.45 },
    { label: "pCO₂", value: `${ABG_RESULT.pCO2} mmHg`, normal: "35-45 mmHg", flagged: ABG_RESULT.pCO2 > 45 || ABG_RESULT.pCO2 < 35 },
    { label: "pO₂", value: `${ABG_RESULT.pO2} mmHg`, normal: "> 80 mmHg", flagged: ABG_RESULT.pO2 < 80 },
    { label: "HCO₃", value: `${ABG_RESULT.HCO3} mEq/L`, normal: "22-26 mEq/L", flagged: false },
    { label: "SpO₂", value: `${ABG_RESULT.SpO2}%`, normal: "92-96%*", flagged: ABG_RESULT.SpO2 < 92 },
    { label: "BE", value: `${ABG_RESULT.BE} mEq/L`, normal: "-2 to +2", flagged: Math.abs(ABG_RESULT.BE) > 2 },
  ];

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Wind size={16} className="text-sky-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className="text-xs text-white/40">
          {new Date(ABG_RESULT.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-3">
        {/* ABG Values */}
        <div className="grid grid-cols-3 gap-2">
          {ABG_METRICS.map((m) => (
            <div
              key={m.label}
              className={`p-2 rounded-lg border text-center ${
                m.flagged ? "border-amber-500/30 bg-amber-500/8" : "border-white/8 bg-white/3"
              }`}
            >
              <div className={`text-lg font-bold ${m.flagged ? "text-amber-300" : "text-white"}`}>
                {m.value}
              </div>
              <div className="text-[10px] text-white/50 font-semibold">{m.label}</div>
              <div className="text-[9px] text-white/25 mt-0.5">{m.normal}</div>
            </div>
          ))}
        </div>

        {/* Interpretation */}
        <div className="p-2 rounded-lg border border-sky-500/20 bg-sky-500/5 space-y-1">
          <p className="text-[10px] text-sky-300 font-semibold uppercase tracking-wide mb-1.5">ABG Interpretation</p>
          {interpretation.map((issue, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {issue.type === "normal" ? (
                <CheckCircle size={10} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle size={10} className={`${issue.type === "abnormal" ? "text-red-400" : "text-amber-400"} flex-shrink-0`} />
              )}
              <span className={`text-xs ${issue.type === "normal" ? "text-white/50" : "text-white/80"}`}>
                {issue.label}
              </span>
            </div>
          ))}
        </div>

        {/* Ventilator/O2 Settings */}
        <div className="p-2 rounded-lg border border-white/8 bg-white/3">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1.5">O₂ Delivery</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-white/40 block">Mode</span>
              <span className="text-white font-medium">{VENTILATOR_SETTINGS.mode}</span>
            </div>
            <div>
              <span className="text-white/40 block">Flow</span>
              <span className="text-white font-medium">{VENTILATOR_SETTINGS.flow}</span>
            </div>
            <div>
              <span className="text-white/40 block">FiO₂</span>
              <span className="text-white font-medium">{VENTILATOR_SETTINGS.FiO2}</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-300/70 mt-1.5">{VENTILATOR_SETTINGS.note}</p>
        </div>
      </div>
    </div>
  );
}
