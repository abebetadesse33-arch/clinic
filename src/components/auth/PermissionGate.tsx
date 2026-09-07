"use client";

import React from "react";
import { useClinic } from "../../context/ClinicContext";
import { ClinicalPermission, hasPermission, getRoleScopeDetails } from "../../lib/security/roles-permissions";
import { Lock, ShieldAlert, AlertCircle } from "lucide-react";

interface PermissionGateProps {
  permission: ClinicalPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  actionName?: string;
  hideIfDenied?: boolean;
}

export default function PermissionGate({
  permission,
  children,
  fallback,
  actionName = "This clinical action",
  hideIfDenied = false,
}: PermissionGateProps) {
  const { currentRole, currentUser } = useClinic();
  const allowed = hasPermission(currentRole, permission);

  if (allowed) {
    return <>{children}</>;
  }

  if (hideIfDenied) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const roleScope = getRoleScopeDetails(currentRole);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs cursor-not-allowed opacity-75 group relative"
      title={`${actionName} is out of licensed scope for ${roleScope.label}. Required: Prescriptive/Clinical Authority.`}
    >
      <Lock className="w-3.5 h-3.5 text-amber-400/80" />
      <span>{actionName}</span>
      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-semibold ml-1">
        Restricted
      </span>

      {/* Hover tooltip */}
      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-[11px] text-slate-300 z-50 pointer-events-none">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Scope of Practice Restriction</span>
        </div>
        <p className="leading-tight text-slate-400">
          Your active role (<strong className="text-white">{roleScope.label}</strong>) does not have privileges for: <span className="text-teal-300 font-mono">{permission}</span>.
        </p>
      </div>
    </div>
  );
}
