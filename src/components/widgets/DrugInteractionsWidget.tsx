"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Pill, Zap, AlertTriangle, CheckCircle, Calculator, Search } from "lucide-react";

const DDI_ALERTS = [
  {
    id: "ddi-01",
    severity: "critical" as const,
    drug1: "Warfarin",
    drug2: "Fluconazole",
    mechanism: "CYP2C9 inhibition → ↑ warfarin exposure",
    risk: "Major bleeding risk (INR > 4.0 expected)",
    recommendation: "Avoid combination. If necessary, reduce warfarin dose by 50% and monitor INR daily.",
    pgxNote: "CYP2C19 *2/*2 poor metabolizer — additional sensitivity",
  },
  {
    id: "ddi-02",
    severity: "high" as const,
    drug1: "Metformin",
    drug2: "Contrast Dye (CT)",
    mechanism: "Risk of contrast-induced nephropathy with renal impairment",
    risk: "Lactic acidosis risk with eGFR 52 mL/min",
    recommendation: "Hold Metformin 48h before and after IV contrast. Monitor renal function.",
    pgxNote: null,
  },
  {
    id: "ddi-03",
    severity: "medium" as const,
    drug1: "Lisinopril",
    drug2: "Potassium Supplements",
    mechanism: "Additive hyperkalemia risk via RAA suppression",
    risk: "K+ elevation — monitor closely with CKD",
    recommendation: "Monitor serum K+ weekly. Target < 5.0 mEq/L.",
    pgxNote: null,
  },
];

const SEVERITY_STYLES = {
  critical: { border: "border-red-500/40", bg: "bg-red-500/8", badge: "bg-red-500/20 text-red-300", icon: "text-red-400" },
  high: { border: "border-amber-500/40", bg: "bg-amber-500/8", badge: "bg-amber-500/20 text-amber-300", icon: "text-amber-400" },
  medium: { border: "border-yellow-500/40", bg: "bg-yellow-500/8", badge: "bg-yellow-500/20 text-yellow-300", icon: "text-yellow-400" },
};

export default function DrugInteractionsWidget({ title }: WidgetProps) {
  const { medications, labResults } = useClinic();
  const [searchDrug, setSearchDrug] = useState("");
  const [renalDose, setRenalDose] = useState<string | null>(null);

  const egfr = labResults.find((l) => l.testName?.toLowerCase().includes("egfr"));
  const egfrValue = egfr ? parseFloat(egfr.value) : 52;

  const getRenalAdjustment = (drug: string): string => {
    const d = drug.toLowerCase();
    if (d.includes("metformin")) {
      if (egfrValue < 30) return "⛔ CONTRAINDICATED (eGFR < 30)";
      if (egfrValue < 45) return "⚠️ Use with caution — reduce dose by 50%";
      return "✅ Full dose OK (eGFR ≥ 45)";
    }
    if (d.includes("lisinopril")) {
      if (egfrValue < 30) return "⚠️ Start at 2.5mg, titrate carefully";
      return "✅ 10mg dose appropriate";
    }
    if (d.includes("empagliflozin")) {
      if (egfrValue < 45) return "⛔ Not recommended (eGFR < 45)";
      return "✅ 10mg appropriate for eGFR 52";
    }
    return "No specific renal guidance found";
  };

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Pill size={16} className="text-purple-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className="widget-badge widget-badge-alert">{DDI_ALERTS.length} interactions</span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-3">
        {/* Renal Calculator */}
        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Calculator size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-300">Renal Dosing Calculator</span>
            <span className="text-xs text-white/40 ml-auto">eGFR: {egfrValue} mL/min</span>
          </div>
          <div className="flex gap-2">
            <input
              value={searchDrug}
              onChange={(e) => setSearchDrug(e.target.value)}
              placeholder="Drug name…"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <button
              onClick={() => setRenalDose(searchDrug ? getRenalAdjustment(searchDrug) : null)}
              className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs hover:bg-blue-500/30 flex items-center gap-1"
            >
              <Search size={11} />
              Check
            </button>
          </div>
          {renalDose && (
            <p className="text-xs text-white/70 mt-2 p-2 bg-white/5 rounded">{renalDose}</p>
          )}
        </div>

        {/* DDI Alerts */}
        {DDI_ALERTS.map((ddi) => {
          const styles = SEVERITY_STYLES[ddi.severity];
          return (
            <div key={ddi.id} className={`p-3 rounded-lg border ${styles.border} ${styles.bg}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className={`${styles.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">
                      {ddi.drug1} + {ddi.drug2}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles.badge}`}>
                      {ddi.severity}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">{ddi.mechanism}</p>
                  <p className="text-xs text-white/70 mt-1">{ddi.risk}</p>
                  <p className="text-xs text-emerald-400/80 mt-1.5">💊 {ddi.recommendation}</p>
                  {ddi.pgxNote && (
                    <p className="text-xs text-violet-400/80 mt-1">
                      <Zap size={9} className="inline mr-0.5" />
                      PGx: {ddi.pgxNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
