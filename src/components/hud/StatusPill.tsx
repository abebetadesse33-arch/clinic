"use client";

import React from "react";

export type StatusPillVariant =
  | "critical"
  | "warning"
  | "stable"
  | "info"
  | "online"
  | "offline";

export interface StatusPillProps {
  variant?: StatusPillVariant;
  label?: string;
  pulse?: boolean;
  className?: string;
}

const VARIANT_CONFIG: Record<
  StatusPillVariant,
  { dot: string; glow: string; text: string; bg: string; border: string }
> = {
  critical: {
    dot: "bg-red-500",
    glow: "0 0 8px rgba(255, 45, 85, 0.8)",
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  warning: {
    dot: "bg-amber-400",
    glow: "0 0 8px rgba(255, 176, 0, 0.8)",
    text: "text-amber-300",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  stable: {
    dot: "bg-emerald-400",
    glow: "0 0 8px rgba(0, 255, 136, 0.8)",
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  online: {
    dot: "bg-emerald-400",
    glow: "0 0 8px rgba(0, 255, 136, 0.8)",
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  info: {
    dot: "bg-cyan-400",
    glow: "0 0 8px rgba(0, 240, 255, 0.8)",
    text: "text-cyan-300",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/30",
  },
  offline: {
    dot: "bg-slate-500",
    glow: "none",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
  },
};

export function StatusPill({
  variant = "stable",
  label,
  pulse = true,
  className = "",
}: StatusPillProps) {
  const config = VARIANT_CONFIG[variant];
  const displayLabel = label || variant.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[0.6875rem] uppercase tracking-wider select-none ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block w-1.5 h-1.5 rounded-full ${config.dot} ${
          pulse && variant !== "offline" ? "animate-pulse" : ""
        }`}
        style={{ boxShadow: config.glow }}
      />
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusPill;
