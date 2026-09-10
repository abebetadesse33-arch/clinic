"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useClinic } from "../../context/ClinicContext";
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  Dna,
  Brain,
  HeartHandshake,
  Stethoscope,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
  Calendar,
} from "lucide-react";

export default function PatientsDirectoryPage() {
  const { patients, selectPatient, addPatient, currentRole } = useClinic();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for New Patient
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1975-05-20");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [bloodType, setBloodType] = useState("O+");
  const [phone, setPhone] = useState("(555) 000-0000");
  const [email, setEmail] = useState("");
  const [allergySubstance, setAllergySubstance] = useState("");
  const [allergySeverity, setAllergySeverity] = useState<"mild" | "moderate" | "severe" | "anaphylactic">("moderate");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [triagePriority, setTriagePriority] = useState<"routine" | "urgent" | "critical">("routine");

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm));
    const matchesPriority = priorityFilter === "all" || p.triagePriority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;

    const birthYear = new Date(dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    const allergies = allergySubstance
      ? [{ substance: allergySubstance, severity: allergySeverity, reaction: allergyReaction || "Skin rash" }]
      : [];

    addPatient({
      firstName,
      lastName,
      dateOfBirth,
      age,
      gender,
      bloodType,
      phone,
      email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      allergies,
      emergencyContact: "Emergency Contact on file",
      primaryDoctor: "Dr. Sarah Mitchell, MD",
      triagePriority,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
    });

    setShowAddModal(false);
    setFirstName("");
    setLastName("");
    setAllergySubstance("");
  };

  if (currentRole === "patient") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-800 dark:text-slate-200 shadow-sm">
          Patients can only access their own profile and health records.
        </div>
      </div>
    );
  }

  const criticalCount = patients.filter((p) => p.triagePriority === "critical").length;
  const urgentCount = patients.filter((p) => p.triagePriority === "urgent").length;
  const routineCount = patients.filter((p) => p.triagePriority === "routine" || !p.triagePriority).length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#005C4B]/10 dark:bg-teal-500/15 text-[#005C4B] dark:text-teal-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Patient 360° Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clinical management with instant search, biopsychosocial context, and triage routing.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#005C4B] hover:bg-[#00483B] dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Triage Filter Chips */}
      <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Patient Name, MRN, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#005C4B] dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop View Switcher & Counter */}
          <div className="flex items-center justify-between md:justify-end gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
              Showing <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> of {patients.length}
            </span>

            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="Grid Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="Compact Table"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Triage Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Priority:
          </span>
          <button
            type="button"
            onClick={() => setPriorityFilter("all")}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              priorityFilter === "all"
                ? "bg-[#005C4B] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>All Patients</span>
            <span className="text-[10px] opacity-80">({patients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter("critical")}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              priorityFilter === "critical"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Critical</span>
            <span className="text-[10px] font-mono font-bold">({criticalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter("urgent")}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              priorityFilter === "urgent"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
            }`}
          >
            <span>Urgent</span>
            <span className="text-[10px] font-mono font-bold">({urgentCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter("routine")}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              priorityFilter === "routine"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
            }`}
          >
            <span>Routine</span>
            <span className="text-[10px] font-mono font-bold">({routineCount})</span>
          </button>
        </div>
      </div>

      {/* Results Content */}
      {filtered.length === 0 ? (
        <div className="p-10 sm:p-14 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Matching Patients</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No clinical records match &ldquo;{searchTerm}&rdquo; under the selected filter.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setPriorityFilter("all");
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Clinical Compact Table View (Desktop-Optimized) */
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">MRN</th>
                  <th className="py-3 px-4">Age / Sex</th>
                  <th className="py-3 px-4">Blood</th>
                  <th className="py-3 px-4">Triage</th>
                  <th className="py-3 px-4">Physician</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {filtered.map((patient) => {
                  const priorityBadge =
                    patient.triagePriority === "critical"
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                      : patient.triagePriority === "urgent"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={patient.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"}
                            alt={patient.firstName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {patient.firstName} {patient.lastName}
                            </span>
                            <span className="text-[10px] text-slate-500">{patient.phone || "No phone"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#005C4B] dark:text-teal-400">
                        {patient.mrn}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {patient.age}y / {patient.gender}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {patient.bloodType || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${priorityBadge}`}>
                          {patient.triagePriority || "routine"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {patient.primaryDoctor || "Unassigned"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/patients/${patient.id}`}
                          onClick={() => selectPatient(patient.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005C4B]/10 hover:bg-[#005C4B] text-[#005C4B] hover:text-white font-bold text-xs transition-colors"
                        >
                          <span>View Record</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Spacious Yango-Style Patient Cards Grid (Uncramped, big tap targets, rounded-3xl) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((patient) => {
            const priorityBadge =
              patient.triagePriority === "critical"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : patient.triagePriority === "urgent"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

            return (
              <div
                key={patient.id}
                className="group p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 shadow-sm hover:shadow-xl hover:border-[#005C4B]/40 dark:hover:border-teal-500/40 transition-all flex flex-col justify-between gap-5"
              >
                {/* Header: Large Avatar + Patient Info + Triage Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={patient.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"}
                      alt={patient.firstName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm shrink-0"
                    />
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug group-hover:text-[#005C4B] dark:group-hover:text-teal-400 transition-colors">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-bold text-[#005C4B] dark:text-teal-400">
                          {patient.mrn}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {patient.age}y, {patient.gender}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${priorityBadge}`}>
                    {patient.triagePriority || "routine"}
                  </span>
                </div>

                {/* Info Tiles: Spacious 2-col pill stats */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Blood Group</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {patient.bloodType || "Not recorded"}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Attending Doctor</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {patient.primaryDoctor || "General Clinic"}
                    </span>
                  </div>
                </div>

                {/* Big Yango-Style Action Button: 48px high, full width, easy tap */}
                <Link
                  href={`/patients/${patient.id}`}
                  onClick={() => selectPatient(patient.id)}
                  className="w-full h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-[#005C4B] hover:text-white dark:hover:bg-[#005C4B] dark:hover:text-white text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm"
                >
                  <span>View Full Medical Record</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Register New Patient</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                    placeholder="e.g. Eleanor"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                    placeholder="e.g. Vance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">DOB</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Blood Group</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Triage Initial</label>
                  <select
                    value={triagePriority}
                    onChange={(e) => setTriagePriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#005C4B]"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Allergy */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold">
                  Documented Drug Allergy (Optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Substance (e.g. Penicillin)"
                    value={allergySubstance}
                    onChange={(e) => setAllergySubstance(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white"
                  />
                  <select
                    value={allergySeverity}
                    onChange={(e) => setAllergySeverity(e.target.value as any)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="anaphylactic">Anaphylactic</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Reaction (e.g. Hives)"
                    value={allergyReaction}
                    onChange={(e) => setAllergyReaction(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#005C4B] hover:bg-[#00483B] text-white font-bold transition-all shadow-sm"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
