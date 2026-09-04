"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { FlaskConical, Shield, Plus, BookOpen } from "lucide-react";

const SEED_RULES = [
  {
    id: "rule-01",
    category: "Pharmacogenomics",
    title: "CPIC CYP2C19 *2/*2 — Clopidogrel Inefficacy",
    description: "Poor metabolizers (CYP2C19 *2/*2) cannot adequately activate clopidogrel. 2-3× increased MACE risk vs. normal metabolizers.",
    evidenceGrade: "A",
    recommendation: "Use alternative antiplatelet: Prasugrel 10mg/day OR Ticagrelor 90mg BID (preferred with CKD for renal clearance profile)",
    source: "CPIC Guideline 2021 — DOI: 10.1002/cpt.2008",
    active: true,
  },
  {
    id: "rule-02",
    category: "Renal Pharmacology",
    title: "Metformin — eGFR-Stratified Dosing Protocol",
    description: "Biguanide accumulation risk with renal impairment. FDA 2016 label revision allows use down to eGFR 30 with dose modification.",
    evidenceGrade: "B",
    recommendation: "eGFR ≥ 45: full dose | eGFR 30-44: 50% dose reduction, monitor q3mo | eGFR < 30: CONTRAINDICATED",
    source: "FDA Drug Safety Communication 2016; KDIGO CKD 2022",
    active: true,
  },
  {
    id: "rule-03",
    category: "Biochemistry",
    title: "HbA1c Interpretation — Hemolytic Anemia Confounding",
    description: "HbA1c unreliable in hemolytic anemia, sickle cell, and iron deficiency due to altered erythrocyte lifespan.",
    evidenceGrade: "B",
    recommendation: "Use fructosamine or glycated albumin for glycemic monitoring when HbA1c accuracy is questionable",
    source: "ADA Standards of Care 2024 — Section 6",
    active: true,
  },
];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  C: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  D: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function BiologicalRulesWidget({ title }: WidgetProps) {
  const { biologicalRules } = useClinic();
  const [selected, setSelected] = useState<string | null>(null);

  const allRules = SEED_RULES;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-amber-400" />
          <span className="widget-title">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="widget-badge">{allRules.length} rules</span>
        </div>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {allRules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-lg border transition-all ${
              selected === rule.id ? "border-amber-500/40 bg-amber-500/8" : "border-white/8 bg-white/3"
            }`}
          >
            <button
              className="w-full p-3 text-left"
              onClick={() => setSelected(selected === rule.id ? null : rule.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{rule.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${GRADE_COLORS[rule.evidenceGrade] ?? "bg-white/8 text-white/40 border-white/10"}`}>
                      Grade {rule.evidenceGrade}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400/70 mt-0.5 block">{rule.category}</span>
                </div>
                <Shield size={13} className="text-amber-400/50 flex-shrink-0" />
              </div>
            </button>

            {selected === rule.id && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/8">
                <p className="text-xs text-white/60">{rule.description}</p>
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-400 font-semibold mb-0.5">RECOMMENDATION</p>
                  <p className="text-xs text-white/80">{rule.recommendation}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen size={10} className="text-white/30" />
                  <p className="text-[10px] text-white/30">{rule.source}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
