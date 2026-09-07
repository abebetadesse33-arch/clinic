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
      <div className="glass-panel rounded-2xl p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("specialist")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                viewMode === "specialist"
                  ? "bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-sm border border-teal-500/20"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Specialist Workstation</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("modular_grid")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                viewMode === "modular_grid"
                  ? "bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-sm border border-teal-500/20"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Modular Widget Grid</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 text-teal-800 dark:text-teal-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="capitalize">{currentRole.replace("_", " ")} Workspace</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden md:inline">•</span>
          <span className="hidden md:inline text-slate-600 dark:text-slate-400">
            Active: <strong className="text-slate-900 dark:text-slate-100">{currentUser.fullName}</strong>
          </span>
        </div>
      </div>

      {/* Render Active View */}
      {viewMode === "specialist" ? renderSpecialistDashboard() : <DynamicDashboardGrid />}
    </div>
  );
}
