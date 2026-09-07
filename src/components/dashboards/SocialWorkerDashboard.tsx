"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  Building,
  Bus,
  CheckCircle2,
  HeartHandshake,
  Home,
  Plus,
  ShieldCheck,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

export default function SocialWorkerDashboard() {
  const { patients, selectedPatient, selectPatient, socialHistory, currentUser } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);
  const pSocial = patient ? socialHistory.filter((s) => s.patientId === patient.id) : [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold uppercase">
              Medical Social Work (LCSW) Hub
            </span>
            <span className="text-xs text-slate-500 font-mono">License: {currentUser?.licenseNumber || "LCSW-331902"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Social Determinants of Health (SDOH) & Community Resources
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Social Worker: <strong className="text-slate-900">{currentUser?.fullName || "Medical Social Worker"}</strong> • SDOH & Community Resource Coordination.
          </p>
        </div>

        <select
          value={patient?.id || ""}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-orange-300 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
          {patients.length === 0 && <option value="">No patients available</option>}
        </select>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: SDOH Screening Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <HeartHandshake className="w-4 h-4" />
                Active SDOH Vulnerability Profile
              </h3>
              <span className="text-[10px] text-slate-400">{pSocial.length} Social Risk Factors</span>
            </div>

            <div className="space-y-3">
              {pSocial.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                      {item.category === "food_security" && <Utensils className="w-4 h-4 text-orange-400" />}
                      {item.category === "transportation" && <Bus className="w-4 h-4 text-sky-400" />}
                      {item.category === "housing" && <Home className="w-4 h-4 text-emerald-400" />}
                      {item.category === "income_employment" && <Wallet className="w-4 h-4 text-amber-400" />}
                      {item.category === "social_support" && <Users className="w-4 h-4 text-purple-400" />}
                      {item.indicator}
                    </span>
                    <span
                      className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                        item.severityLevel === "high"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {item.severityLevel} Severity
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{item.description}</p>

                  {item.recommendedAction && (
                    <div className="p-2.5 rounded-lg bg-orange-950/40 border border-orange-800/40 text-orange-200">
                      <strong>Social Work Intervention:</strong> {item.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Connected Community Resources */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-orange-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-orange-400" />
              Connected Community & Government Aid
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>SNAP Emergency Food Assistance</span>
                  <span className="text-[10px] text-emerald-400">Application Approved</span>
                </div>
                <p className="text-[11px] text-slate-400">Monthly $180 electronic benefit transfer for nutritious groceries.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>County Subsidized Medical Transit</span>
                  <span className="text-[10px] text-emerald-400">Card Issued</span>
                </div>
                <p className="text-[11px] text-slate-400">Door-to-door paratransit transport for clinic visits and pharmacy pick-up.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Community Diabetes Education Group</span>
                  <span className="text-[10px] text-teal-400">Enrolled (Weekly)</span>
                </div>
                <p className="text-[11px] text-slate-400">Peer support group meeting every Tuesday at local community center.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
