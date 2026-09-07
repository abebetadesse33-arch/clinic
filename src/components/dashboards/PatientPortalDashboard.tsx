"use client";

import React from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  Activity,
  Apple,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  Heart,
  HeartPulse,
  Pill,
  ShieldCheck,
  Sparkles,
  User,
  Utensils,
} from "lucide-react";

export default function PatientPortalDashboard() {
  const { patients, selectedPatient, prescriptions, labResults, currentUser } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);
  const pRx = patient ? prescriptions.filter((p) => p.patientId === patient.id) : [];
  const pLabs = patient ? labResults.filter((l) => l.patientId === patient.id) : [];

  const patientAvatar = patient?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300";
  const firstName = patient?.firstName || currentUser?.fullName?.split(" ")[0] || "Patient";
  const lastName = patient?.lastName || "";
  const mrn = patient?.mrn || "MRN-ACTIVE";
  const primaryDoctor = patient?.primaryDoctor || "Dr. Sarah Mitchell, MD";

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={patientAvatar}
            alt={firstName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-200 shadow-xl"
          />
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold uppercase">
              My Patient Health Portal
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Welcome, {firstName} {lastName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              MRN: <strong className="text-slate-900">{mrn}</strong> • Primary Physician: <strong className="text-teal-700">{primaryDoctor}</strong>
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-500 block">Next Scheduled Care Visit</span>
          <span className="text-sm font-extrabold text-sky-700">Thursday, 10:30 AM (Dietetics & PT)</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Active Prescriptions & Care Directives */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prescriptions */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <Pill className="w-4 h-4" />
              My Active Prescriptions & Instructions
            </h3>

            <div className="space-y-3">
              {pRx.map((rx) => (
                <div key={rx.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">
                      {rx.medicationName} <span className="text-sky-400">({rx.dosage})</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      Verified by Pharmacy
                    </span>
                  </div>

                  <p className="text-slate-300 font-medium">How to take: {rx.instructions}</p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Quantity: {rx.quantity} tabs ({rx.refillsAllowed} refills remaining)</span>
                    <span>Prescribed by: {rx.doctorName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Goals */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <HeartPulse className="w-4 h-4" />
              My Daily Wellness Goals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" /> Daily Hydration
                </span>
                <p className="text-[11px] text-slate-300">Drink 6-8 glasses of water daily while taking your morning Jardiance medication.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-lime-400" /> Sodium Limit
                </span>
                <p className="text-[11px] text-slate-300">Rinse canned black beans with water and avoid high-sodium processed seasonings.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Lab Results + Quick Service Links */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recent Verified Lab Results */}
          <div className="glass-card p-5 rounded-2xl border border-sky-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Recent Verified Lab Tests
            </h3>

            <div className="space-y-2 text-xs">
              {pLabs.map((lab) => (
                <div key={lab.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{lab.testName}</span>
                    <span className="text-[10px] text-slate-400">{lab.category}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold block ${lab.isAbnormal ? "text-rose-400" : "text-emerald-400"}`}>
                      {lab.value} {lab.unit}
                    </span>
                    <span className="text-[10px] text-slate-500">{lab.interpretation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Self-Service Actions */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Self-Service Patient Services
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="/patient/dashboard?tab=appointments"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-teal-400 transition-all block text-left"
              >
                <Calendar className="w-4 h-4 text-teal-400 mb-1" />
                <span className="font-bold text-white block">Appointments</span>
                <span className="text-[10px] text-slate-400">Book & Telehealth</span>
              </a>
              <a
                href="/patient/dashboard?tab=referrals"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-teal-400 transition-all block text-left"
              >
                <Heart className="w-4 h-4 text-sky-400 mb-1" />
                <span className="font-bold text-white block">Referrals</span>
                <span className="text-[10px] text-slate-400">Request Specialist</span>
              </a>
              <a
                href="/patient/dashboard?tab=messages"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-teal-400 transition-all block text-left"
              >
                <User className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="font-bold text-white block">Care Messages</span>
                <span className="text-[10px] text-slate-400">Contact Doctor</span>
              </a>
              <a
                href="/patient/dashboard?tab=consents"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-teal-400 transition-all block text-left"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 mb-1" />
                <span className="font-bold text-white block">Privacy & Consents</span>
                <span className="text-[10px] text-slate-400">AI & Data Sharing</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
