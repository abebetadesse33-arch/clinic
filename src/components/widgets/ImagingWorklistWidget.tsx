"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Image, Eye, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending_read: "bg-amber-500/10 border-amber-500/30",
  read: "bg-white/5 border-white/10",
};

export default function ImagingWorklistWidget({ title }: WidgetProps) {
  const { selectedPatient, patients } = useClinic();
  const activePatient = selectedPatient || patients[0];
  const patientDisplayName = activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : "Patient";
  const patientMrn = activePatient?.mrn || "MRN-ACTIVE";

  const [selected, setSelected] = useState<string | null>(null);
  const [impression, setImpression] = useState("");

  const worklist = [
    {
      id: "img-01",
      modality: "Chest X-Ray",
      patient: patientDisplayName,
      mrn: patientMrn,
      orderedBy: "Attending Physician",
      orderedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: "pending_read" as const,
      priority: "routine" as const,
      impression: null,
      findings: null,
    },
    {
      id: "img-02",
      modality: "Renal Ultrasound",
      patient: patientDisplayName,
      mrn: patientMrn,
      orderedBy: "Attending Physician",
      orderedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      status: "read" as const,
      priority: "urgent" as const,
      impression: "Bilateral kidneys mildly echogenic consistent with chronic kidney disease. No hydronephrosis. No focal masses.",
      findings: "Right kidney 10.1 cm, left kidney 9.8 cm. Cortical thinning bilaterally. No lithiasis identified.",
    },
    {
      id: "img-03",
      modality: "Echocardiogram",
      patient: patientDisplayName,
      mrn: patientMrn,
      orderedBy: "Attending Physician",
      orderedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      status: "read" as const,
      priority: "routine" as const,
      impression: "Mildly reduced LVEF 50-55%. Mild LVH. Grade I diastolic dysfunction. No significant valvular disease.",
      findings: "EF 52%, wall motion normal, LV mass 112g/m². E/A ratio 0.8.",
    },
  ];

  const pending = worklist.filter((w) => w.status === "pending_read").length;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Image size={16} className="text-cyan-400" />
          <span className="widget-title">{title}</span>
        </div>
        {pending > 0 && (
          <span className="widget-badge widget-badge-alert">{pending} unread</span>
        )}
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {worklist.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border transition-all ${STATUS_STYLES[item.status]}`}
          >
            <button
              className="w-full p-3 text-left"
              onClick={() => setSelected(selected === item.id ? null : item.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {item.status === "pending_read" ? (
                      <Clock size={13} className="text-amber-400" />
                    ) : (
                      <CheckCircle size={13} className="text-emerald-400" />
                    )}
                    <span className="text-sm font-semibold text-white">{item.modality}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.priority === "urgent" ? "bg-red-500/20 text-red-300" : "bg-white/8 text-white/40"
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {item.patient} · {item.mrn} · Ordered by {item.orderedBy}
                  </div>
                  <div className="text-xs text-white/30 mt-0.5">
                    {new Date(item.orderedAt).toLocaleString()}
                  </div>
                </div>
                <Eye size={14} className="text-white/20 flex-shrink-0" />
              </div>
            </button>

            {selected === item.id && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/8">
                {item.findings && (
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Findings</p>
                    <p className="text-xs text-white/70">{item.findings}</p>
                  </div>
                )}
                {item.impression && (
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Impression</p>
                    <p className="text-xs text-white/80 font-medium">{item.impression}</p>
                  </div>
                )}
                {item.status === "pending_read" && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={impression}
                      onChange={(e) => setImpression(e.target.value)}
                      placeholder="Type radiologist impression…"
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none h-20"
                    />
                    <button className="w-full btn-sm-primary">Sign & Complete Read</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
