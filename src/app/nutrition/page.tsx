"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import {
  Apple,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Leaf,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wheat,
} from "lucide-react";

export default function NutritionSuitePage() {
  return (
    <RoleGuard
      allowedRoles={[
        "dietitian",
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Medical Nutrition Therapy (MNT) Studio"
      fallbackMessage="Access to medical nutrition therapy and metabolic meal planning protocols is restricted to clinical dietitians, physicians, and care coordinators."
    >
      <NutritionSuiteContent />
    </RoleGuard>
  );
}

function NutritionSuiteContent() {
  const { patients, selectedPatient, selectPatient, nutritionAssessments, currentUser } = useClinic();

  const patient = selectedPatient || patients[0];
  const nutrition = nutritionAssessments.find((n) => n.patientId === patient.id) || nutritionAssessments[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-lime-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-500/20 text-lime-300 border border-lime-500/30 text-xs font-bold uppercase">
              Clinical Nutrition & Dietetics Suite
            </span>
            <span className="text-xs text-slate-400 font-mono">MRN: {patient.mrn}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Medical Nutrition Therapy (MNT) Studio
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Diabetic renal macronutrient targets, glycemic index control, and food desert economic accommodations.
          </p>
        </div>

        <select
          value={patient.id}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
        </select>
      </div>

      {/* Target Nutrients Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-lime-500/30 bg-lime-950/20 text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Daily Caloric Target</span>
          <div className="text-xl font-extrabold text-white">
            {nutrition?.dailyCalorieTarget || 1800} <span className="text-xs font-normal text-slate-400">kcal</span>
          </div>
          <span className="text-[10px] text-lime-400">Metabolic Basal Rate Adjusted</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Protein Target</span>
          <div className="text-xl font-extrabold text-white">
            {nutrition?.proteinTargetGrams || 65} <span className="text-xs font-normal text-slate-400">g/day</span>
          </div>
          <span className="text-[10px] text-slate-400">0.8 g/kg CKD 3b Cap</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Sodium Limit</span>
          <div className="text-xl font-extrabold text-amber-400">
            &lt; {nutrition?.sodiumLimitMg || 2000} <span className="text-xs font-normal text-slate-400">mg</span>
          </div>
          <span className="text-[10px] text-amber-400">Strict Cardiorenal Target</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Nutritional Risk Score</span>
          <div className="text-base font-extrabold text-teal-300 capitalize">
            {nutrition?.nutritionalRiskScore?.replace("_", " ") || "Moderate Risk"}
          </div>
          <span className="text-[10px] text-slate-400">Monthly Follow-Up Required</span>
        </div>
      </div>

      {/* Main Meal Plan Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Structured Meal Plan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Structured Renal-Diabetic Meal Structure
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-lime-500/20 text-lime-300 font-bold">
                Low Glycemic Index
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-teal-400 uppercase block">Breakfast (350-400 kcal)</span>
                <p className="text-slate-200">
                  {nutrition?.mealPlanDetails?.breakfast ||
                    "Rolled oats (1/2 cup dry) cooked in water, topped with ground cinnamon, 1 tbsp chia seeds, and 1/4 cup unsweetened frozen blueberries."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-teal-400 uppercase block">Lunch (450-500 kcal)</span>
                <p className="text-slate-200">
                  {nutrition?.mealPlanDetails?.lunch ||
                    "Warm Mediterranean bean salad: 1 cup canned black beans (thoroughly rinsed to remove 40% sodium), 1/2 cup diced cucumber, tomatoes, olive oil (1 tbsp), and lemon juice with 1 slice whole grain toast."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-teal-400 uppercase block">Dinner (500-550 kcal)</span>
                <p className="text-slate-200">
                  {nutrition?.mealPlanDetails?.dinner ||
                    "Baked firm tofu or skinless chicken breast (3 oz) seasoned with garlic and oregano (no salt), served over 1/2 cup brown rice and 1.5 cups steamed frozen broccoli/spinach."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-teal-400 uppercase block">Healthy Snacks (150-200 kcal)</span>
                <p className="text-slate-200">
                  {nutrition?.mealPlanDetails?.snacks ||
                    "1 small apple with 1 tbsp natural unsalted peanut butter, or 1/2 cup plain low-fat Greek yogurt."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Food Desert Strategy */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-lime-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-lime-300 uppercase tracking-wider flex items-center gap-2">
              <Leaf className="w-4 h-4 text-lime-400" />
              Food Insecurity & Budget Strategy
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {nutrition?.foodInsecurityAccommodation ||
                "Plan tailored specifically for patient residing in USDA food desert. Emphasizes shelf-stable, low-cost pantry staples accessible at budget grocers (canned legumes rinsed, frozen spinach, rolled oats, brown rice) avoiding costly boutique health foods."}
            </p>

            <div className="p-3 rounded-xl bg-lime-950/40 border border-lime-800/40 text-xs text-lime-200 space-y-1">
              <strong>Dietitian SDOH Recommendation:</strong>
              <p className="text-[11px] text-slate-300">
                Connected with Hospital Produce Prescription program for $40/month fresh fruit and vegetable subsidized farm vouchers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
