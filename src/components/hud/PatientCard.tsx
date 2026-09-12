"use client";

import React from "react";
import { HudPanel } from "./HudPanel";
import { HudRing } from "./HudRing";
import { StatusPill, type StatusPillVariant } from "./StatusPill";
import { HudButton } from "./HudButton";

export interface PatientCardProps {
  name: string;
  mrn: string;
  age: number;
  gender: string;
  triage: StatusPillVariant;
  vitals?: {
    hr: number;
    bp: string;
    spo2: number;
  };
  bedOrRoom?: string;
  onViewEhr?: () => void;
  onOrderLabs?: () => void;
  className?: string;
}

export function PatientCard({
  name,
  mrn,
  age,
  gender,
  triage = "stable",
  vitals = { hr: 74, bp: "120/80", spo2: 98 },
  bedOrRoom,
  onViewEhr,
  onOrderLabs,
  className = "",
}: PatientCardProps) {
  return (
    <HudPanel
      variant="refract"
      depth="md"
      className={`relative p-5 overflow-hidden ${className}`}
    >
      {/* Top row: Avatar + Demographics + Triage */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar Ring */}
          <div className="relative">
            <HudRing size="sm" variant="orbital" color="cyan" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-cyan-300">
              {name.charAt(0)}
            </div>
          </div>

          <div>
            <h3 className="font-heading font-bold text-base text-slate-100 tracking-wide">
              {name}
            </h3>
            <p className="font-mono text-xs text-slate-400">
              MRN: <span className="text-cyan-400">{mrn}</span> · {age}y · {gender}
              {bedOrRoom && ` · Room ${bedOrRoom}`}
            </p>
          </div>
        </div>

        <StatusPill variant={triage} />
      </div>

      {/* Vitals Telemetry Row */}
      <div className="grid grid-cols-3 gap-2.5 py-3 my-2 border-y border-slate-800/80 bg-slate-950/40 rounded-lg px-3">
        <div className="text-center">
          <span className="block font-mono text-[0.625rem] text-slate-500 uppercase tracking-widest">
            HEART RATE
          </span>
          <span className="font-mono text-lg font-bold text-emerald-400">
            {vitals.hr}{" "}
            <span className="text-[0.625rem] font-normal text-slate-400">BPM</span>
          </span>
        </div>

        <div className="text-center border-x border-slate-800/80">
          <span className="block font-mono text-[0.625rem] text-slate-500 uppercase tracking-widest">
            BLOOD PRESS
          </span>
          <span className="font-mono text-lg font-bold text-cyan-400">
            {vitals.bp}{" "}
            <span className="text-[0.625rem] font-normal text-slate-400">mmHg</span>
          </span>
        </div>

        <div className="text-center">
          <span className="block font-mono text-[0.625rem] text-slate-500 uppercase tracking-widest">
            OXYGEN SAT
          </span>
          <span className="font-mono text-lg font-bold text-cyan-300">
            {vitals.spo2}
            <span className="text-[0.625rem] font-normal text-slate-400">%</span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4">
        {onViewEhr && (
          <HudButton
            variant="primary"
            size="sm"
            onClick={onViewEhr}
            className="flex-1"
          >
            VIEW EHR
          </HudButton>
        )}
        {onOrderLabs && (
          <HudButton
            variant="outline"
            size="sm"
            onClick={onOrderLabs}
            className="flex-1"
          >
            ORDER LABS
          </HudButton>
        )}
      </div>
    </HudPanel>
  );
}

export default PatientCard;
