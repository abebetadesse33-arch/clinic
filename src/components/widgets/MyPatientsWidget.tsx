"use client";

import React from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import {
  Users, AlertCircle, Activity, Stethoscope,
  Clock, ChevronRight, Badge
} from "lucide-react";

const TRIAGE_COLORS = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  urgent: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  routine: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

export default function MyPatientsWidget({ title }: WidgetProps) {
  const { patients, selectedPatient, selectPatient } = useClinic();

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className="widget-badge">{patients.length} active</span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {patients.map((patient) => (
          <button
            key={patient.id}
            onClick={() => selectPatient(patient.id)}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:border-white/20 hover:bg-white/5 ${
              selectedPatient?.id === patient.id
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/8 bg-white/3"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                      TRIAGE_COLORS[patient.triagePriority]
                    }`}
                  >
                    {patient.triagePriority}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/40">{patient.mrn}</span>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/40">
                    {patient.age}y {patient.gender}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/40">{patient.primaryDoctor}</span>
                </div>
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle size={10} className="text-amber-400" />
                    <span className="text-xs text-amber-400/70">
                      {patient.allergies.length} allerg{patient.allergies.length > 1 ? "ies" : "y"}
                    </span>
                  </div>
                )}
              </div>
              <ChevronRight size={14} className="text-white/20 flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
