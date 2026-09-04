"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  FileCheck,
  CalendarCheck,
  XCircle,
  Activity,
  UserCheck,
} from "lucide-react";

export type CaseStatus =
  | "registered"
  | "triaged"
  | "assigned"
  | "waiting"
  | "in_consultation"
  | "labs_ordered"
  | "results_ready"
  | "treatment_planned"
  | "completed"
  | "follow_up_scheduled"
  | "cancelled"
  | "pending_ai_analysis"
  | "ai_analyzed"
  | "under_review"
  | "awaiting_tests"
  | "escalated"
  | "active"
  | "resolved"
  | "closed";

interface CaseStatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export default function CaseStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: CaseStatusBadgeProps) {
  const norm = status?.toLowerCase() || "registered";

  let label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let colorStyles = "bg-slate-800 text-slate-300 border-slate-700";
  let Icon = Clock;

  switch (norm) {
    case "registered":
    case "pending_ai_analysis":
      label = "Registered";
      colorStyles = "bg-sky-500/15 text-sky-400 border-sky-500/30";
      Icon = Clock;
      break;

    case "triaged":
    case "ai_analyzed":
      label = "AI Triaged";
      colorStyles = "bg-teal-500/15 text-teal-400 border-teal-500/30";
      Icon = Activity;
      break;

    case "assigned":
      label = "Doctor Assigned";
      colorStyles = "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      Icon = UserCheck;
      break;

    case "waiting":
      label = "In Queue (Waiting)";
      colorStyles = "bg-amber-500/15 text-amber-400 border-amber-500/30";
      Icon = Clock;
      break;

    case "in_consultation":
    case "under_review":
    case "active":
      label = "In Consultation";
      colorStyles = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/20";
      Icon = Stethoscope;
      break;

    case "labs_ordered":
    case "awaiting_tests":
      label = "Labs Ordered";
      colorStyles = "bg-purple-500/15 text-purple-400 border-purple-500/30";
      Icon = FlaskConical;
      break;

    case "results_ready":
      label = "Results Ready";
      colorStyles = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      Icon = FileCheck;
      break;

    case "treatment_planned":
      label = "Treatment Planned";
      colorStyles = "bg-teal-500/20 text-teal-300 border-teal-500/30";
      Icon = CheckCircle2;
      break;

    case "completed":
    case "resolved":
    case "closed":
      label = "Consultation Completed";
      colorStyles = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      Icon = CheckCircle2;
      break;

    case "follow_up_scheduled":
      label = "Follow-Up Scheduled";
      colorStyles = "bg-blue-500/15 text-blue-400 border-blue-500/30";
      Icon = CalendarCheck;
      break;

    case "escalated":
      label = "Escalated Emergency";
      colorStyles = "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse";
      Icon = AlertCircle;
      break;

    case "cancelled":
      label = "Cancelled";
      colorStyles = "bg-slate-800/80 text-slate-400 border-slate-700";
      Icon = XCircle;
      break;
  }

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-bold",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide transition-all ${sizeStyles} ${colorStyles}`}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />}
      <span>{label}</span>
    </span>
  );
}
