"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Pill, CheckCircle, Clock, AlertCircle, Shield } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  due: "border-amber-500/30 bg-amber-500/8",
  administered: "border-emerald-500/30 bg-emerald-500/8",
  upcoming: "border-white/8 bg-white/3",
  held: "border-red-500/30 bg-red-500/8",
  refused: "border-red-500/30 bg-red-500/8",
};

export default function MedicationAdministrationWidget({ title }: WidgetProps) {
  const { selectedPatient, patients } = useClinic();
  const activePatient = selectedPatient || patients[0];
  const patientDisplayName = activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : "Patient";

  const shiftMeds = [
    { id: "mar-01", name: "Empagliflozin 10mg", route: "PO", time: "08:00", patient: patientDisplayName, note: "Hold if glucose < 70 mg/dL", status: "due" as const },
    { id: "mar-02", name: "Metformin 500mg", route: "PO", time: "08:00", patient: patientDisplayName, note: "Hold if eGFR < 30. Current eGFR > 50 — OK", status: "due" as const },
    { id: "mar-03", name: "Lisinopril 10mg", route: "PO", time: "08:00", patient: patientDisplayName, note: "Monitor BP post-dose. Target < 130/80", status: "due" as const },
    { id: "mar-04", name: "Atorvastatin 40mg", route: "PO", time: "22:00", patient: patientDisplayName, note: "Evening dose — Safety Cleared", status: "upcoming" as const },
  ];

  const [marStatuses, setMarStatuses] = useState<Record<string, "administered" | "held" | "refused" | "due" | "upcoming">>(
    Object.fromEntries(shiftMeds.map((m) => [m.id, m.status]))
  );
  const [verifier, setVerifier] = useState<string | null>(null);

  const handleAdminister = (medId: string) => {
    setMarStatuses((prev) => ({ ...prev, [medId]: "administered" }));
  };

  const handleHold = (medId: string) => {
    setMarStatuses((prev) => ({ ...prev, [medId]: "held" }));
  };

  const administered = Object.values(marStatuses).filter((s) => s === "administered").length;
  const due = Object.values(marStatuses).filter((s) => s === "due").length;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Pill size={16} className="text-indigo-400" />
          <span className="widget-title">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-emerald-400">{administered} given</span>
          {due > 0 && <span className="widget-badge widget-badge-alert">{due} due</span>}
        </div>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {shiftMeds.map((med) => {
          const status = marStatuses[med.id];
          return (
            <div
              key={med.id}
              className={`p-3 rounded-lg border transition-all ${STATUS_COLORS[status]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{med.name}</span>
                    <span className="text-xs text-white/40">{med.route}</span>
                    {status === "administered" && <CheckCircle size={13} className="text-emerald-400" />}
                    {status === "held" && <AlertCircle size={13} className="text-red-400" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={10} className="text-white/30" />
                    <span className="text-xs text-white/40">{med.time}</span>
                    <span className="text-xs text-white/30 truncate">— {med.note}</span>
                  </div>
                </div>

                {status === "due" && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleHold(med.id)}
                      className="text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25"
                    >
                      Hold
                    </button>
                    <button
                      onClick={() => handleAdminister(med.id)}
                      className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25"
                    >
                      ✓ Give
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dual-check badge */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <Shield size={12} className="text-blue-400" />
          <span className="text-xs text-white/40">5-Right MAR protocol active — Dual-check required for high-alert meds</span>
        </div>
      </div>
    </div>
  );
}
