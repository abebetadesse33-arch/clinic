"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import { Role } from "../../lib/types/clinical";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Dna,
  Edit3,
  Filter,
  HeartHandshake,
  HeartPulse,
  Layers,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Utensils,
  Wind,
  X,
} from "lucide-react";

export default function UnifiedCarePlanPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "dietitian",
        "physiotherapist",
        "occupational_therapist",
        "social_worker",
        "psychologist",
        "pharmacist",
        "respiratory_therapist",
        "system_admin",
        "tenant_admin",
        "auditor",
      ]}
      fallbackTitle="Multidisciplinary Unified Care Plan"
      fallbackMessage="Access to multidisciplinary care plan authoring and goal tracking is restricted to licensed care team members."
    >
      <UnifiedCarePlanContent />
    </RoleGuard>
  );
}

function UnifiedCarePlanContent() {
  const {
    patients,
    selectedPatient,
    selectPatient,
    carePlans,
    updateCarePlanInterventionStatus,
    addCarePlanIntervention,
    currentUser,
    currentRole,
  } = useClinic();

  const [activeRoleFilter, setActiveRoleFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Intervention Form
  const [newRole, setNewRole] = useState<Role>("nurse");
  const [newDescription, setNewDescription] = useState("");
  const [newFrequency, setNewFrequency] = useState("Daily");

  const patient = selectedPatient || patients[0];
  const patientCarePlan = carePlans.find((cp) => cp.patientId === patient.id) || carePlans[0];

  const filteredInterventions = patientCarePlan?.interventions.filter((item) => {
    if (activeRoleFilter === "all") return true;
    return item.role === activeRoleFilter;
  }) || [];

  const handleAddInterventionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    addCarePlanIntervention(patient.id, {
      role: newRole,
      roleTitle: newRole.replace("_", " ").toUpperCase(),
      description: newDescription,
      frequency: newFrequency,
      status: "active",
      signedBy: currentUser.fullName,
    });

    setShowAddModal(false);
    setNewDescription("");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "physician":
        return <Stethoscope className="w-4 h-4 text-teal-400" />;
      case "nurse":
        return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case "pharmacist":
        return <Pill className="w-4 h-4 text-cyan-400" />;
      case "physiotherapist":
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case "dietitian":
        return <Utensils className="w-4 h-4 text-lime-400" />;
      case "social_worker":
        return <HeartHandshake className="w-4 h-4 text-orange-400" />;
      case "psychologist":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "genetic_counselor":
        return <Dna className="w-4 h-4 text-fuchsia-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase">
              Multidisciplinary Care Coordination
            </span>
            <span className="text-xs text-slate-400 font-mono">Patient MRN: {patient.mrn}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Unified Shared Patient Care Plan
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Synchronized clinical directives across Physicians, Nursing, Pharmacy, Physiotherapy, Nutrition, and Social Work.
          </p>
        </div>

        {/* Patient Switcher & Action */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={patient.id}
            onChange={(e) => selectPatient(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.mrn})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Add Care Directive
          </button>
        </div>
      </div>

      {/* Primary Diagnosis & Overarching Goals Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diagnosis & Care Plan Status */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Primary Diagnosis</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
              {patientCarePlan?.status || "Active Plan"}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-white">
            {patientCarePlan?.primaryDiagnosis || "Type 2 Diabetes Mellitus with CKD Stage 3b"}
          </h3>
          <p className="text-xs text-slate-300">
            Care Coordinator: <strong className="text-teal-400">Dr. Sarah Mitchell, MD</strong>
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Last Updated: {patientCarePlan ? new Date(patientCarePlan.updatedAt).toLocaleDateString() : "Today"}</span>
            <span className="text-teal-300 font-semibold">{patientCarePlan?.interventions.length || 0} Directives</span>
          </div>
        </div>

        {/* Overarching Care Goals (2 Cols) */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-teal-400" />
            Overarching Multidisciplinary Clinical Goals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {patientCarePlan?.goals.map((goal) => (
              <div key={goal.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-400 uppercase">{goal.assignedRole}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{goal.targetDate}</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-snug">{goal.title}</h4>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold pt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Status: In Progress
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter Role:
        </span>
        {[
          { id: "all", label: "All Specialists" },
          { id: "physician", label: "Physician (MD/NP)" },
          { id: "nurse", label: "Nursing (RN)" },
          { id: "pharmacist", label: "Pharmacy (PharmD)" },
          { id: "physiotherapist", label: "Physiotherapy (PT)" },
          { id: "dietitian", label: "Dietetics (RD)" },
          { id: "social_worker", label: "Social Work (LCSW)" },
          { id: "psychologist", label: "Psychology (PsyD)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveRoleFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeRoleFilter === tab.id
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-900/20"
                : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Multidisciplinary Interventions Grid */}
      <div className="space-y-3">
        {filteredInterventions.map((item, idx) => {
          const isCompleted = item.status === "completed";
          return (
            <div
              key={item.id || idx}
              className={`p-4 rounded-2xl border transition-all ${
                isCompleted
                  ? "bg-slate-950/60 border-slate-800 opacity-60"
                  : "glass-card border-slate-700/80 hover:border-teal-500/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 mt-0.5">
                    {getRoleIcon(item.role)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        {item.roleTitle}
                      </span>
                      <span className="text-xs text-slate-400">• Frequency: {item.frequency}</span>
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${isCompleted ? "line-through text-slate-400" : "text-white"}`}>
                      {item.description}
                    </p>
                    {item.signedBy && (
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Assigned/Authorized by: <strong className="text-slate-400">{item.signedBy}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Toggle Button */}
                <button
                  onClick={() =>
                    updateCarePlanInterventionStatus(
                      patient.id,
                      item.id,
                      isCompleted ? "active" : "completed"
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-center ${
                    isCompleted
                      ? "bg-slate-800 text-slate-400 hover:text-white"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isCompleted ? "Mark Incomplete" : "Sign Off / Complete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Directive Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-400" />
                Add Multidisciplinary Care Directive
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInterventionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Healthcare Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="physician">Physician / Prescriber</option>
                    <option value="nurse">Nursing (RN)</option>
                    <option value="pharmacist">Clinical Pharmacist</option>
                    <option value="physiotherapist">Physiotherapist (PT)</option>
                    <option value="dietitian">Dietitian / Nutritionist</option>
                    <option value="social_worker">Medical Social Worker</option>
                    <option value="psychologist">Clinical Psychologist</option>
                    <option value="respiratory_therapist">Respiratory Therapist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Execution Frequency</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily, 3x/week, Bi-weekly"
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Intervention / Clinical Directive Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the clinical directive, monitoring protocol, or therapy regimen..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
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
                  Save to Care Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
