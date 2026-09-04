"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, Plus, AlertTriangle, ShieldCheck, ArrowRight, Activity, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPULAR_SYMPTOMS = [
  "Fatigue & Weakness",
  "Elevated Blood Sugar",
  "Frequent Urination",
  "Shortness of Breath",
  "Chest Tightness",
  "Joint Stiffness & Pain",
  "Persistent Dry Cough",
  "Headache & Dizziness",
  "Anxiety & Insomnia",
  "Digestive Discomfort",
];

export function AdaSymptomCheckerSection() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["Fatigue & Weakness", "Elevated Blood Sugar"]);
  const [age, setAge] = useState("48");
  const [gender, setGender] = useState("female");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggleSymptom = (s: string) => {
    if (selectedSymptoms.includes(s)) {
      setSelectedSymptoms(selectedSymptoms.filter((item) => item !== s));
    } else {
      setSelectedSymptoms([...selectedSymptoms, s]);
    }
  };

  const handleEvaluate = () => {
    setIsEvaluating(true);
    setResult(null);

    setTimeout(() => {
      setIsEvaluating(false);
      setResult({
        primaryDiagnosis: "Metabolic Dysregulation / Type 2 Diabetes Mellitus Presentation",
        confidence: 94,
        triageUrgency: "Moderate Priority — Clinical Assessment Advised within 24-48 Hours",
        differentials: [
          { name: "Type 2 Diabetes Mellitus (Uncontrolled Fasting Hyperglycemia)", probability: "High (84%)" },
          { name: "Diabetic Peripheral Neuropathy / Sensory Deficit", probability: "Moderate (52%)" },
          { name: "Metabolic Syndrome & Cardiometabolic Risk", probability: "Moderate (46%)" },
        ],
        recommendedHandler: "Dr. Sarah Mitchell, MD (Endocrinology & Internal Medicine)",
        suggestedWorkup: ["Fasting Plasma Glucose & HbA1c", "Lipid Profile & Serum Creatinine", "SLCO1B1 Pharmacogenomic Panel"],
      });
    }, 1200);
  };

  return (
    <section id="ada-symptom-checker" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-slate-900 via-[#002b24] to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-900/50 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold uppercase">
                Ada Health × NiniMed Intelligence
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Gemini 1.5 Pro Medical CDSS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Interactive AI Symptom Assessment</h2>
            <p className="text-xs text-slate-300 mt-0.5">Select symptoms to generate an instant clinical differential and risk assessment preview</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-2xl border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" /> 100% Confidential & Free
          </div>
        </div>

        {/* Step 1: Symptoms Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            1. Select Your Current Symptoms (Click to toggle)
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SYMPTOMS.map((s) => {
              const isSelected = selectedSymptoms.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20"
                      : "bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 opacity-60" />}
                  <span>{s}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Patient Context & Action */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs text-slate-400 block font-bold mb-1">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block font-bold mb-1">Biological Sex</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleEvaluate}
              isLoading={isEvaluating}
              disabled={selectedSymptoms.length === 0}
              size="lg"
              className="w-full h-[42px] text-xs font-bold"
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Run AI Triage Assessment
            </Button>
          </div>
        </div>

        {/* Output Assessment Preview */}
        {result && (
          <div className="bg-slate-950/90 border border-teal-500/40 rounded-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-sm font-extrabold text-white">AI Diagnostic Assessment Results</h4>
              </div>
              <span className="text-xs font-mono text-teal-300 font-bold">{result.confidence}% Diagnostic Confidence</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{result.triageUrgency}</span>
              </div>
              <div className="text-sm font-bold text-white">
                Primary Clinical Consideration: <span className="text-teal-300">{result.primaryDiagnosis}</span>
              </div>
            </div>

            {/* Differential Probabilities */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Differential Considerations:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {result.differentials.map((d: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="font-bold text-slate-200">{d.name}</div>
                    <div className="text-[10px] text-teal-400 font-mono mt-0.5">{d.probability}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Workup & CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-950/40 border border-teal-500/30 rounded-xl p-4 pt-3">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Recommended Specialist:</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                  {result.recommendedHandler}
                </span>
              </div>
              <Link
                href="/patient/submit-case"
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0"
              >
                <span>Proceed to Full Case Intake</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
