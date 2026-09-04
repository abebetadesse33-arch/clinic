"use client";

import React from "react";
import Link from "next/link";
import { useClinic } from "../../context/ClinicContext";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  HeartHandshake,
  MessageSquare,
  Users,
} from "lucide-react";

export default function CareCoordinatorDashboard() {
  const { patients, carePlans, tasks, teamMessages, currentUser } = useClinic();

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-bold uppercase">
              Care Navigation & Coordination Hub
            </span>
            <span className="text-xs text-slate-500 font-mono">Coordinator: {currentUser.fullName}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Multidisciplinary Care Synchronization & Navigation
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track patient journeys, ensure closed-loop referrals between specialists, and prevent care gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/care-plan"
            className="px-4 py-2.5 rounded-2xl bg-white/80 border border-yellow-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)] hover:bg-white"
          >
            <ClipboardList className="w-4 h-4 text-yellow-600" />
            Unified Care Plans
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Active Patients Managed</span>
          <div className="text-2xl font-extrabold text-slate-900">{patients.length}</div>
          <span className="text-[10px] text-teal-600">100% Care Plan Active</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl border border-yellow-100 bg-yellow-50/80 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Open Referral Tasks</span>
          <div className="text-2xl font-extrabold text-yellow-700">{tasks.filter((t) => t.status !== "completed").length}</div>
          <span className="text-[10px] text-slate-600">Across 4 Specialties</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Clinical Messages</span>
          <div className="text-2xl font-extrabold text-slate-900">{teamMessages.length}</div>
          <span className="text-[10px] text-emerald-600">Interdisciplinary Chat</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Care Gaps Identified</span>
          <div className="text-2xl font-extrabold text-emerald-600">0</div>
          <span className="text-[10px] text-emerald-600">All Goals In Progress</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Active Care Plans Progress */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Active Multidisciplinary Care Plans
              </h3>
              <span className="text-[10px] text-slate-400">Synchronized View</span>
            </div>

            <div className="space-y-3">
              {carePlans.map((cp) => {
                const p = patients.find((pat) => pat.id === cp.patientId);
                return (
                  <div key={cp.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">
                        {p?.firstName} {p?.lastName} ({p?.mrn})
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        {cp.status}
                      </span>
                    </div>

                    <p className="text-slate-300 font-medium">{cp.primaryDiagnosis}</p>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{cp.interventions.length} Directives Assigned</span>
                      <Link href="/care-plan" className="text-teal-400 font-semibold hover:underline">
                        Open Shared Plan →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Team Consult Tasks */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-yellow-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Specialist Task Tracking
            </h3>

            <div className="space-y-2.5 text-xs">
              {tasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{t.title}</span>
                    <span className="text-[10px] font-mono text-teal-400 uppercase">{t.assignedToRole}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
