"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Leaf, Target, ShoppingCart, AlertCircle } from "lucide-react";

const MNT_PLAN = {
  calories: { target: 1800, current: 1650 },
  protein: { target: 60, current: 52, unit: "g" },
  sodium: { target: 2000, current: 1780, unit: "mg" },
  potassium: { target: 2000, current: 1920, unit: "mg" },
  phosphorus: { target: 800, current: 710, unit: "mg" },
  carbs: { target: 180, current: 165, unit: "g" },
};

const FOOD_DESERT_RESOURCES = [
  { name: "City Food Bank (2.1 mi)", type: "food_bank", available: true, note: "Open M/W/F 9am-4pm" },
  { name: "SNAP Monthly Benefit $180", type: "snap", available: true, note: "Application submitted" },
  { name: "Farmers Market Voucher $30", type: "voucher", available: false, note: "Apply at front desk" },
  { name: "Congregate Meal Site (0.8 mi)", type: "meal", available: true, note: "Mon-Sat noon meals" },
];

const MACRO_COLORS = {
  calories: "bg-orange-400",
  protein: "bg-blue-400",
  sodium: "bg-red-400",
  potassium: "bg-purple-400",
  phosphorus: "bg-yellow-400",
  carbs: "bg-emerald-400",
};

export default function NutritionPlanWidget({ title }: WidgetProps) {
  const { selectedPatient, patients } = useClinic();
  const activePatient = selectedPatient || patients[0];
  const patientDisplayName = activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : "Registered Patient";

  const [activeTab, setActiveTab] = useState<"mnt" | "resources">("mnt");

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Leaf size={16} className="text-emerald-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className="text-xs text-white/40">Renal + Diabetic MNT</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 gap-3">
        {(["mnt", "resources"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab ? "border-emerald-400 text-emerald-400" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {tab === "mnt" ? "MNT Targets" : "Community Resources"}
          </button>
        ))}
      </div>

      <div className="widget-body flex-1 overflow-y-auto">
        {activeTab === "mnt" && (
          <div className="space-y-3">
            {/* Patient info */}
            <div className="p-2 rounded-lg bg-white/3 border border-white/8 text-xs text-white/50">
              {patientDisplayName} · T2DM + CKD Evaluation · Personalized MNT Plan
            </div>

            {/* Macronutrient bars */}
            {Object.entries(MNT_PLAN).map(([key, data]) => {
              const pct = Math.round((data.current / data.target) * 100);
              const over = pct > 100;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${over ? "text-red-400" : "text-white/60"}`}>
                        {data.current}{"unit" in data ? ` ${data.unit}` : " kcal"}
                      </span>
                      <span className="text-xs text-white/30">
                        / {data.target}{"unit" in data ? ` ${data.unit}` : " kcal"}
                      </span>
                      {over && <AlertCircle size={11} className="text-red-400" />}
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${over ? "bg-red-400" : MACRO_COLORS[key as keyof typeof MACRO_COLORS] ?? "bg-white/40"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Diet notes */}
            <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300/80 space-y-1">
              <p>• Avoid high-K foods: banana, orange, tomato, potato</p>
              <p>• Limit phosphorus: dairy, nuts, processed foods</p>
              <p>• Target sodium &lt; 2,000 mg/day for BP control</p>
              <p>• Caloric distribution: 45% carbs / 20% protein / 35% fat</p>
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-2">
            <p className="text-xs text-white/40 pb-1">Patient lives in ZIP code with limited grocery access (food desert tier 2)</p>
            {FOOD_DESERT_RESOURCES.map((r) => (
              <div
                key={r.name}
                className={`p-3 rounded-lg border ${r.available ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/8 bg-white/3"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={12} className={r.available ? "text-emerald-400" : "text-white/30"} />
                      <span className="text-xs font-medium text-white">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-white/40 mt-0.5 block">{r.note}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.available ? "bg-emerald-500/20 text-emerald-300" : "bg-white/8 text-white/30"}`}>
                    {r.available ? "Active" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
