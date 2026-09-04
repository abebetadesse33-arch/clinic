"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  BookOpen,
  CheckCircle2,
  Database,
  Dna,
  FlaskConical,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

export default function BiologistDashboard() {
  const { biologicalRules, addBiologicalRule, currentUser } = useClinic();

  const [showAddModal, setShowAddModal] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceGrade, setEvidenceGrade] = useState("Level 1A (Guidelines)");
  const [sourceCitation, setSourceCitation] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    addBiologicalRule({
      category: "pharmacogenomics",
      ruleTitle,
      description,
      evidenceGrade,
      sourceCitation,
      isActive: true,
    });

    setShowAddModal(false);
    setRuleTitle("");
    setDescription("");
    setSourceCitation("");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold uppercase">
              Molecular Biology & Knowledge Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">Curator: {currentUser.fullName}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Biological Rule Curation & CPIC Guidelines Engine
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Author and validate deterministic pharmacogenomic and biochemical rules governing the clinical AI reasoning engine.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-white/80 border border-teal-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)] hover:bg-white"
        >
          <Plus className="w-4 h-4 text-teal-600" />
          Author Biological Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4" />
            Active Clinical & Pharmacogenomic Rules ({biologicalRules.length})
          </h3>
          <span className="text-[10px] text-slate-400">Deterministic Knowledgebase</span>
        </div>

        <div className="space-y-3">
          {biologicalRules.map((rule) => (
            <div key={rule.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{rule.ruleTitle}</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                  {rule.evidenceGrade}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">{rule.description}</p>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Citation: {rule.sourceCitation}</span>
                <span>Curated by: {rule.curatedBy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-400" />
                Author Biological & Pharmacogenomic Rule
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CYP2D6 Ultrarapid Metabolizer Codeine Toxicity Risk"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Biological Logic *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe mechanism, consequence, and contraindicated drugs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Evidence Grade</label>
                  <select
                    value={evidenceGrade}
                    onChange={(e) => setEvidenceGrade(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Level 1A (Guidelines)">Level 1A (Guidelines)</option>
                    <option value="Level 1B (Clinical Trial)">Level 1B (Clinical Trial)</option>
                    <option value="Level 2A (Pharmacogenomics)">Level 2A (Pharmacogenomics)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Source Citation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPIC Guidelines 2026"
                    value={sourceCitation}
                    onChange={(e) => setSourceCitation(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Publish Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
