"use client";

import React, { useState } from "react";
import { useClinic } from "../context/ClinicContext";
import GuestLandingView from "../components/guest/GuestLandingView";
import DynamicDashboardGrid from "../components/widgets/DynamicDashboardGrid";
import PatientDashboardPage from "./patient/dashboard/page";
import AdminPortalPage from "./admin/page";

// Specialist Dedicated Dashboards
import PhysicianDashboard from "../components/dashboards/PhysicianDashboard";
import NurseDashboard from "../components/dashboards/NurseDashboard";
import PharmacistDashboard from "../components/dashboards/PharmacistDashboard";
import DietitianDashboard from "../components/dashboards/DietitianDashboard";
import PhysiotherapistDashboard from "../components/dashboards/PhysiotherapistDashboard";
import PsychologistDashboard from "../components/dashboards/PsychologistDashboard";
import SocialWorkerDashboard from "../components/dashboards/SocialWorkerDashboard";
import BiologistDashboard from "../components/dashboards/BiologistDashboard";
import CareCoordinatorDashboard from "../components/dashboards/CareCoordinatorDashboard";
import AuditorDashboard from "../components/dashboards/AuditorDashboard";
import GeneticCounselorDashboard from "../components/dashboards/GeneticCounselorDashboard";
import RespiratoryDashboard from "../components/dashboards/RespiratoryDashboard";
import { LayoutGrid, Sparkles, SlidersHorizontal, Stethoscope } from "lucide-react";

export default function HomePage() {
  const { currentRole, isGuest, currentUser } = useClinic();
  const [viewMode, setViewMode] = useState<"specialist" | "modular_grid">("specialist");

  // 1. Guest Visitor View
  if (isGuest) {
    return <GuestLandingView />;
  }

  // 2. Patient Account View
  if (currentRole === "patient") {
    return <PatientDashboardPage />;
  }

  // 3. System Admin & Operations View
  if (currentRole === "system_admin" || currentRole === "tenant_admin") {
    return <AdminPortalPage />;
  }

  // 4. Compliance Auditor View
  if (currentRole === "auditor") {
    return <AuditorDashboard />;
  }

  // Specialist Component Resolver
  const renderSpecialistDashboard = () => {
    switch (currentRole) {
      case "physician":
      case "nurse_practitioner":
        return <PhysicianDashboard />;
      case "nurse":
        return <NurseDashboard />;
      case "pharmacist":
        return <PharmacistDashboard />;
      case "dietitian":
        return <DietitianDashboard />;
      case "physiotherapist":
      case "occupational_therapist":
        return <PhysiotherapistDashboard />;
      case "psychologist":
        return <PsychologistDashboard />;
      case "social_worker":
        return <SocialWorkerDashboard />;
      case "biologist":
        return <BiologistDashboard />;
      case "genetic_counselor":
        return <GeneticCounselorDashboard />;
      case "respiratory_therapist":
        return <RespiratoryDashboard />;
      case "care_coordinator":
        return <CareCoordinatorDashboard />;
      case "radiologist":
      case "pathologist":
      case "lab_technician":
        return <PhysicianDashboard />;
      default:
        return <PhysicianDashboard />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Workspace View Mode Switcher Header */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">Workspace Mode</span>
          <div className="flex items-center p-1 rounded-2xl bg-white/60 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-[0_18px_34px_-26px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <button
              onClick={() => setViewMode("specialist")}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "specialist"
                  ? "bg-teal-500/15 text-teal-700 border border-teal-200 shadow-sm dark:bg-teal-500/10 dark:text-teal-200 dark:border-teal-400/30"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Specialist Workstation</span>
            </button>
            <button
              onClick={() => setViewMode("modular_grid")}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "modular_grid"
                  ? "bg-teal-500/15 text-teal-700 border border-teal-200 shadow-sm dark:bg-teal-500/10 dark:text-teal-200 dark:border-teal-400/30"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Modular Widget Grid</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
          <span>Logged in as <strong className="text-slate-700 dark:text-slate-200">{currentUser.fullName}</strong></span>
        </div>
      </div>

      {/* Render Active View */}
      {viewMode === "specialist" ? renderSpecialistDashboard() : <DynamicDashboardGrid />}
    </div>
  );
}
