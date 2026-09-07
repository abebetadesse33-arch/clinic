"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import {
  Brain,
  Plus,
  HeartPulse,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Smile,
  Activity,
} from "lucide-react";

export default function PsychologistHubPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "psychologist",
        "social_worker",
        "physician",
        "nurse_practitioner",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Clinical Psychology & Behavioral Health Studio"
      fallbackMessage="Access to psychological psychometric recording and cognitive evaluation tools is restricted to clinical psychologists, psychiatrists, and authorized behavioral clinicians."
    >
      <PsychologistHubContent />
    </RoleGuard>
  );
}

function PsychologistHubContent() {
  const { patients, psychological, addPsychologicalAssessment, selectedPatient, selectPatient, currentUser } = useClinic();
  const [showAddModal, setShowAddModal] = useState(false);

  const [selectedPatId, setSelectedPatId] = useState(selectedPatient?.id || patients[0]?.id);
  const [testName, setTestName] = useState<"PHQ-9" | "GAD-7" | "HADS" | "MoCA">("PHQ-9");
  const [score, setScore] = useState(14);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [adherenceRisk, setAdherenceRisk] = useState<"low" | "moderate" | "high">("moderate");

  const activePat = patients.find((p) => p.id === selectedPatId) || patients[0];
  const patPsych = psychological.filter((p) => p.patientId === activePat.id);

  const calculateSeverity = (test: string, sc: number): string => {
    if (test === "PHQ-9") {
      if (sc <= 4) return "Minimal / None";
      if (sc <= 9) return "Mild Depression";
      if (sc <= 14) return "Moderate Depression";
      if (sc <= 19) return "Moderately Severe Depression";
      return "Severe Major Depression";
    }
    if (test === "GAD-7") {
      if (sc <= 4) return "Minimal Anxiety";
      if (sc <= 9) return "Mild Anxiety";
      if (sc <= 14) return "Moderate Anxiety";
      return "Severe Anxiety";
    }
    return "Assessed Profile";
  };

  const handleRecordAssessment = (e: React.FormEvent) => {
    e.preventDefault();

    const severity = calculateSeverity(testName, score);
    addPsychologicalAssessment({
      patientId: activePat.id,
      testName: testName as any,
      score,
      severity,
      clinicalNotes: clinicalNotes || `Routine ${testName} clinical assessment. Severity classified as ${severity}.`,
      adherenceRisk,
    });

    setShowAddModal(false);
    setClinicalNotes("");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Psychologist Clinical & Behavioral Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Psychometric screening (PHQ-9, GAD-7, MoCA), behavioral medicine, and executive adherence tracking feeding into the AI model.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Patient Selector */}
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
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Record Assessment
          </button>
        </div>
      </div>

      {/* Overview of Active Patient Psychometrics */}
      <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              Psychological Evaluation Profile: {activePat.firstName} {activePat.lastName}
            </h2>
            <p className="text-xs text-slate-400">MRN: {activePat.mrn} • Age: {activePat.age} • Attending: {currentUser.fullName}</p>
          </div>
          <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/40">
            {patPsych.length} Assessments on Record
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {patPsych.map((rec) => (
            <div key={rec.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold font-mono">
                  {rec.testName}
                </span>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                    rec.adherenceRisk === "high"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : rec.adherenceRisk === "moderate"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {rec.adherenceRisk} Adherence Risk
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{rec.score}</span>
                <span className="text-xs text-slate-400">/ 27 — {rec.severity}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{rec.clinicalNotes}</p>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Date: {rec.assessedAt}</span>
                <span className="text-purple-400 font-semibold">AI Decision Support Synced</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Assessment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Record Psychometric Assessment
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordAssessment} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Standardized Psychometric Test</label>
                <select
                  value={testName}
                  onChange={(e: any) => setTestName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="PHQ-9">PHQ-9 (Patient Health Questionnaire - Depression)</option>
                  <option value="GAD-7">GAD-7 (Generalized Anxiety Disorder 7)</option>
                  <option value="HADS">HADS (Hospital Anxiety & Depression Scale)</option>
                  <option value="MoCA">MoCA (Montreal Cognitive Assessment)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-400">Total Score</label>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {score} ({calculateSeverity(testName, score)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="27"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Medication / Lifestyle Adherence Risk</label>
                <select
                  value={adherenceRisk}
                  onChange={(e: any) => setAdherenceRisk(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="low">Low Risk (Self-motivated, reliable support)</option>
                  <option value="moderate">Moderate Risk (Mild symptoms affecting follow-through)</option>
                  <option value="high">High Risk (Executive dysfunction, acute crisis)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Psychological & Behavioral Notes</label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record cognitive behavioral insights, psychological coping mechanisms, and treatment response..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 h-24"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold shadow-lg"
                >
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
