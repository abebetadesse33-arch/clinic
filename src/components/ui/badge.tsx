"use client";

import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "indigo";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    secondary: "bg-slate-800 text-slate-300 border-slate-700",
    destructive: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    outline: "border-slate-700 text-slate-300",
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  }[variant];

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide transition-colors select-none ${variantStyles} ${className}`}
      {...props}
    />
  );
}
