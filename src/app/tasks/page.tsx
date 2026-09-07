"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import { Role } from "../../lib/types/clinical";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";

export default function TasksDelegationPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "pharmacist",
        "dietitian",
        "physiotherapist",
        "occupational_therapist",
        "social_worker",
        "psychologist",
        "care_coordinator",
        "lab_technician",
        "respiratory_therapist",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Clinical Tasks & Interdisciplinary Delegation Hub"
      fallbackMessage="Access to clinical tasks, care handoffs, and role delegation is restricted to healthcare staff."
    >
      <TasksDelegationContent />
    </RoleGuard>
  );
}

function TasksDelegationContent() {
  const { tasks, patients, createTask, updateTaskStatus, currentUser, currentRole } = useClinic();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  // New Task Form
  const [taskPatientId, setTaskPatientId] = useState(patients[0]?.id || "");
  const [taskRole, setTaskRole] = useState<Role>("dietitian");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"routine" | "urgent" | "stat">("urgent");
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().substring(0, 10));

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (roleFilter !== "all" && t.assignedToRole !== roleFilter) return false;
    if (
      searchQuery &&
      !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const patient = patients.find((p) => p.id === taskPatientId) || patients[0];

    createTask({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      assignedToRole: taskRole,
      assignedByUserName: currentUser.fullName,
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      dueDate: taskDueDate,
    });

    setShowNewModal(false);
    setTaskTitle("");
    setTaskDescription("");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase">
              Interdisciplinary Task Board
            </span>
            <span className="text-xs text-slate-400 font-mono">{tasks.length} Active Clinical Tasks</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Clinical Task Delegation & Inter-Role Referrals
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Assign, track, and execute diagnostic consults, therapy assessments, and social resource connections.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Assign Consult Task
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search task title or patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {["all", "pending", "in_progress", "completed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === st
                  ? "bg-teal-500 text-slate-950"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table / Card List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((t) => {
          const isDone = t.status === "completed";
          return (
            <div
              key={t.id}
              className={`glass-card p-5 rounded-2xl border transition-all space-y-3 ${
                isDone
                  ? "border-slate-800 bg-slate-950/60 opacity-60"
                  : "border-slate-700/80 hover:border-teal-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase">
                    {t.assignedToRole.replace("_", " ")}
                  </span>
                  <h3 className={`text-sm font-bold mt-1.5 ${isDone ? "line-through text-slate-400" : "text-white"}`}>
                    {t.title}
                  </h3>
                </div>

                <span
                  className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                    t.priority === "stat"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : t.priority === "urgent"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {t.priority}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{t.description}</p>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>
                    Patient: <strong className="text-white">{t.patientName}</strong>
                  </span>
                  {t.dueDate && <span>Due: {t.dueDate}</span>}
                </div>
                <div className="text-[10px] text-slate-500">
                  Assigned by: {t.assignedByUserName}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() =>
                    updateTaskStatus(t.id, isDone ? "pending" : "completed")
                  }
                  className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isDone
                      ? "bg-slate-800 text-slate-400 hover:text-white"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isDone ? "Reopen Task" : "Complete Task"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Consult Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-400" />
                Assign Interdisciplinary Consult Task
              </h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Patient</label>
                  <select
                    value={taskPatientId}
                    onChange={(e) => setTaskPatientId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.mrn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Assigned Specialist Role</label>
                  <select
                    value={taskRole}
                    onChange={(e) => setTaskRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="physician">Physician (MD/DO)</option>
                    <option value="nurse">Nurse (RN)</option>
                    <option value="pharmacist">Clinical Pharmacist</option>
                    <option value="physiotherapist">Physiotherapist (PT)</option>
                    <option value="dietitian">Dietitian (RD)</option>
                    <option value="social_worker">Social Worker (LCSW)</option>
                    <option value="psychologist">Psychologist (PsyD)</option>
                    <option value="genetic_counselor">Genetic Counselor</option>
                    <option value="respiratory_therapist">Respiratory Therapist</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT / Immediate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct Diabetic Renal MNT Assessment"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Instructions & Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide details on clinical background, objectives, and specific concerns..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Assign Consult
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
