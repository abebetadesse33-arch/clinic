"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Heart, Thermometer, Wind, Activity, Plus, CheckCircle } from "lucide-react";

export default function VitalsDueWidget({ title }: WidgetProps) {
  const { vitals, addVital, selectedPatient, patients } = useClinic();
  const activePatient = selectedPatient || patients[0];
  const patientDisplayName = activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : "Patient";
  const patientMrn = activePatient?.mrn || "MRN-ACTIVE";

  const vitalsSchedule = [
    { id: "v-01", patient: patientDisplayName, mrn: patientMrn, due: "08:00", vitals: ["BP", "HR", "SpO₂", "Temp", "RR"], status: "due" as const },
    { id: "v-02", patient: patientDisplayName, mrn: patientMrn, due: "12:00", vitals: ["BP", "HR", "SpO₂", "Glucose"], status: "upcoming" as const },
    { id: "v-03", patient: patientDisplayName, mrn: patientMrn, due: "16:00", vitals: ["BP", "HR", "SpO₂", "Temp", "RR", "Pain"], status: "upcoming" as const },
  ];

  const [recording, setRecording] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({ BP: "120/80", HR: "72", SpO2: "98", Temp: "37.0", RR: "16" });
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const handleRecord = (schedId: string) => {
    setCompleted((prev) => new Set(prev).add(schedId));
    setRecording(null);
  };

  const dueCount = vitalsSchedule.filter(
    (v) => v.status === "due" && !completed.has(v.id)
  ).length;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-rose-400" />
          <span className="widget-title">{title}</span>
        </div>
        {dueCount > 0 && (
          <span className="widget-badge widget-badge-alert">{dueCount} due now</span>
        )}
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {vitalsSchedule.map((sched) => {
          const isDone = completed.has(sched.id);
          return (
            <div
              key={sched.id}
              className={`p-3 rounded-lg border transition-all ${
                isDone
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : sched.status === "due"
                  ? "border-rose-500/30 bg-rose-500/8 animate-pulse-slow"
                  : "border-white/8 bg-white/3"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{sched.patient}</span>
                    {sched.status === "due" && !isDone && (
                      <span className="text-xs bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">DUE</span>
                    )}
                    {isDone && <CheckCircle size={14} className="text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {sched.vitals.map((v) => (
                      <span key={v} className="text-[10px] px-1 py-0.5 rounded bg-white/5 text-white/40">{v}</span>
                    ))}
                  </div>
                  <span className="text-xs text-white/30 mt-0.5 block">Scheduled: {sched.due}</span>
                </div>
                {!isDone && sched.status === "due" && (
                  <button
                    onClick={() => setRecording(recording === sched.id ? null : sched.id)}
                    className="btn-sm-primary flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Record
                  </button>
                )}
              </div>

              {/* Quick Entry Form */}
              {recording === sched.id && (
                <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {["BP", "HR", "SpO2", "Temp", "RR"].map((key) => (
                      <div key={key}>
                        <label className="text-[10px] text-white/40 block mb-0.5">{key}</label>
                        <input
                          value={formValues[key as keyof typeof formValues] ?? ""}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleRecord(sched.id)}
                    className="w-full btn-sm-primary mt-2"
                  >
                    Save Vitals
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
