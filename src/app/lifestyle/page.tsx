"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import {
  HeartPulse,
  Utensils,
  Dumbbell,
  Moon,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  Save,
  Users,
} from "lucide-react";

export default function LifestyleStudioPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "dietitian",
        "physiotherapist",
        "psychologist",
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "social_worker",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Lifestyle Medicine & Dietary Prescription Studio"
      fallbackMessage="Access to personalized lifestyle prescription protocols is restricted to clinical multidisciplinary care team members."
    >
      <LifestyleStudioContent />
    </RoleGuard>
  );
}

function LifestyleStudioContent() {
  const { patients, selectedPatient, selectPatient, currentUser } = useClinic();
  const [selectedPatId, setSelectedPatId] = useState(selectedPatient?.id || patients[0]?.id);

  const activePat = patients.find((p) => p.id === selectedPatId) || patients[0];

  const [dietType, setDietType] = useState("Renal-Protective Low-Glycemic Mediterranean Diet");
  const [sodiumLimit, setSodiumLimit] = useState("< 2,000 mg/day");
  const [proteinTarget, setProteinTarget] = useState("0.8 g/kg body weight (Plant-Forward)");
  const [carbGuidance, setCarbGuidance] = useState("Eliminate refined sugars; substitute rolled oats, lentils, barley");
  const [exerciseType, setExerciseType] = useState("Low-impact brisk walking + light resistance bands");
  const [exerciseFreq, setExerciseFreq] = useState("30 mins / day, 5 days per week");
  const [sleepRoutine, setSleepRoutine] = useState("Consistent 10:30 PM bedtime, screen curfew 60 mins prior, cool room");
  const [stressIntervention, setStressIntervention] = useState("10-minute daily diaphragmatic breathing / guided mindfulness");
  const [foodAccessNotes, setFoodAccessNotes] = useState(
    "Utilize low-cost staple pantry items (canned black beans rinsed, frozen spinach, brown rice) to accommodate local food desert constraints."
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Lifestyle & Dietary Prescription Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personalized non-pharmacological lifestyle protocols synthesized from metabolic lab markers and economic realities.
          </p>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <Users className="w-4 h-4 text-teal-400" />
          <select
            value={selectedPatId}
            onChange={(e) => {
              setSelectedPatId(e.target.value);
              selectPatient(e.target.value);
            }}
            className="bg-transparent text-xs text-white font-semibold focus:outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                {p.firstName} {p.lastName} ({p.mrn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <strong>Care Plan Saved:</strong> Lifestyle and dietary protocol assigned to {activePat.firstName} {activePat.lastName}.
        </div>
      )}

      <form onSubmit={handleSavePlan} className="space-y-6">
        {/* Section 1: Dietary Prescription */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Utensils className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Medical Nutritional Therapy (MNT)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Primary Diet Framework</label>
              <input
                type="text"
                value={dietType}
                onChange={(e) => setDietType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Target Sodium Limit</label>
              <input
                type="text"
                value={sodiumLimit}
                onChange={(e) => setSodiumLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Protein Quality & Kidney Target</label>
              <input
                type="text"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Glycemic Carbohydrate Guidance</label>
              <input
                type="text"
                value={carbGuidance}
                onChange={(e) => setCarbGuidance(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Exercise Physiology */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Exercise Physiology & Physical Activity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Prescribed Modality</label>
              <input
                type="text"
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Target Frequency & Duration</label>
              <input
                type="text"
                value={exerciseFreq}
                onChange={(e) => setExerciseFreq(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Sleep, Stress & SDOH Considerations */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Moon className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Sleep Hygiene, Stress & Social Determinants</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Sleep Protocol (CBT-I Aligned)</label>
              <input
                type="text"
                value={sleepRoutine}
                onChange={(e) => setSleepRoutine(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Stress Downregulation & Parasympathetic Activation</label>
              <input
                type="text"
                value={stressIntervention}
                onChange={(e) => setStressIntervention(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-amber-300 font-bold mb-1">Economic & Food Security Accommodation (SDOH)</label>
              <textarea
                rows={2}
                value={foodAccessNotes}
                onChange={(e) => setFoodAccessNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-xl shadow-teal-900/40 transition-all hover:scale-105"
          >
            <Save className="w-4 h-4" />
            Assign Lifestyle & Dietary Protocol
          </button>
        </div>
      </form>
    </div>
  );
}
