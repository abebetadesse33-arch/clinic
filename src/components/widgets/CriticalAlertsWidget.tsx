"use client";

import React from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { AlertTriangle, Zap, Pill, TestTube, Activity } from "lucide-react";

interface Alert {
  id: string;
  type: "lab" | "pgx" | "drug" | "vital" | "sepsis";
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  patient: string;
  time: string;
}

function buildAlerts(labResults: any[], medications: any[], patientName: string): Alert[] {
  const alerts: Alert[] = [];

  // eGFR < 45 alert
  const egfr = labResults.find((l) => l.testName?.toLowerCase().includes("egfr"));
  if (egfr && parseFloat(egfr.value) < 45) {
    alerts.push({
      id: "alert-egfr",
      type: "lab",
      severity: "critical",
      title: `eGFR ${egfr.value} mL/min — Stage 3b CKD`,
      detail: "Renal dosing adjustment required. Hold nephrotoxic agents.",
      patient: patientName,
      time: egfr.orderedAt ?? new Date().toISOString(),
    });
  }

  // HbA1c high
  const hba1c = labResults.find((l) => l.testName?.toLowerCase().includes("hba1c"));
  if (hba1c && parseFloat(hba1c.value) > 8.5) {
    alerts.push({
      id: "alert-hba1c",
      type: "lab",
      severity: "high",
      title: `HbA1c ${hba1c.value}% — Suboptimal Glycemic Control`,
      detail: "Consider intensification of antidiabetic regimen.",
      patient: patientName,
      time: hba1c.orderedAt ?? new Date().toISOString(),
    });
  }

  // PGx CYP2C19 flag
  const warfarin = medications.find((m) => m.name?.toLowerCase().includes("warfarin"));
  if (warfarin) {
    alerts.push({
      id: "alert-pgx",
      type: "pgx",
      severity: "critical",
      title: "PGx Alert — CYP2C19 *2/*2 (Poor Metabolizer)",
      detail: "Warfarin metabolism impaired. Increased bleeding risk. Consider dose reduction.",
      patient: patientName,
      time: new Date().toISOString(),
    });
  }

  // Sepsis screening (simulated BP alert)
  alerts.push({
    id: "alert-bp",
    type: "vital",
    severity: "high",
    title: "BP 158/97 mmHg — Stage 2 Hypertension",
    detail: "Above target for CKD patient (< 130/80). Review antihypertensive regimen.",
    patient: patientName,
    time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  });

  return alerts;
}

const SEVERITY_STYLES = {
  critical: { bg: "bg-red-500/10 border-red-500/30", icon: "text-red-400", badge: "bg-red-500/20 text-red-300" },
  high: { bg: "bg-amber-500/10 border-amber-500/30", icon: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  medium: { bg: "bg-yellow-500/10 border-yellow-500/30", icon: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300" },
};

const TYPE_ICONS = {
  lab: TestTube,
  pgx: Zap,
  drug: Pill,
  vital: Activity,
  sepsis: AlertTriangle,
};

export default function CriticalAlertsWidget({ title }: WidgetProps) {
  const { labResults, medications, selectedPatient, patients } = useClinic();
  const activePatient = selectedPatient || patients[0];
  const patientDisplayName = activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : "Patient";

  const alerts = buildAlerts(labResults, medications, patientDisplayName);
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <span className="widget-title">{title}</span>
        </div>
        {criticalCount > 0 && (
          <span className="widget-badge widget-badge-critical animate-pulse">
            {criticalCount} critical
          </span>
        )}
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-emerald-400/60">
            <span className="text-xs">No active alerts</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity];
            const Icon = TYPE_ICONS[alert.type];
            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border ${styles.bg} space-y-1`}
              >
                <div className="flex items-start gap-2">
                  <Icon size={13} className={`${styles.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-white">{alert.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles.badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{alert.detail}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30">{alert.patient}</span>
                      <span className="text-[10px] text-white/25">
                        {new Date(alert.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
