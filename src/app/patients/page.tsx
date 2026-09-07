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
} from "lucide-react";

export default function PatientsDirectoryPage() {
  const { patients, selectPatient, addPatient, currentRole } = useClinic();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
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
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase());
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
    // Reset form
    setFirstName("");
    setLastName("");
    setAllergySubstance("");
  };

  if (currentRole === "patient") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center text-sm text-slate-200">
          Patients can only access their own account and health record.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Patient 360° Directory</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive biopsychosocial clinical profiles with integrated genomics, labs, and psychometrics.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Register New Patient
        </button>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name, MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Triage:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Priorities ({patients.length})</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </select>
        </div>
      </div>

      {/* Patients Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <Users className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Patients Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No clinical records match your search or filter criteria. Register a new patient to initialize their biopsychosocial profile.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setPriorityFilter("all");
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
          >
            + Register First Patient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((patient) => {
            const priorityStyle =
              patient.triagePriority === "critical"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : patient.triagePriority === "urgent"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

            return (
              <div
                key={patient.id}
                className="glass-card glass-card-hover rounded-2xl border border-slate-800 p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={patient.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"}
                        alt={patient.firstName || "Patient"}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                      />
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <p className="text-xs font-mono text-teal-400">{patient.mrn}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityStyle}`}>
                      {patient.triagePriority || "routine"}
                    </span>
                  </div>

                  {/* Demographics */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase">Age / Gender:</span>
                      <p className="font-semibold text-slate-200">
                        {patient.age} yrs • {(patient.gender || "U").toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase">Blood Type:</span>
                      <p className="font-semibold text-slate-200">{patient.bloodType || "O+"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[10px] uppercase">Primary Physician:</span>
                      <p className="font-medium text-slate-300">{patient.primaryDoctor || "Unassigned"}</p>
                    </div>
                  </div>

                  {/* Allergies / Clinical Tag */}
                  <div className="mt-3">
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">Documented Allergies:</span>
                    {(patient.allergies || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(patient.allergies || []).map((a: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-medium">
                            {typeof a === "string" ? a : `${a.substance || "Allergen"} (${a.severity || "mild"})`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No known drug allergies (NKDA)</span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Registered: {patient.registeredDate}</span>
                  <Link
                    href={`/patients/${patient.id}`}
                    onClick={() => selectPatient(patient.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    View 360° Profile
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                Register New Clinical Patient
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Eleanor"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Vance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Blood Type</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
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
                  <label className="block text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Triage Priority</label>
                  <select
                    value={triagePriority}
                    onChange={(e) => setTriagePriority(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Allergy */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <label className="block text-slate-300 font-bold mb-1">Documented Drug Allergy (Optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Substance (e.g. Penicillin)"
                    value={allergySubstance}
                    onChange={(e) => setAllergySubstance(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                  />
                  <select
                    value={allergySeverity}
                    onChange={(e) => setAllergySeverity(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
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
                    className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg"
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
