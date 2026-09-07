"use client";

import React from "react";
import Link from "next/link";
import { useClinic } from "../../context/ClinicContext";
import { Role } from "../../lib/types/clinical";
import {
  ClinicalPermission,
  hasPermission,
  getRoleScopeDetails,
  ROLE_CAPABILITIES_MATRIX,
} from "../../lib/security/roles-permissions";
import { ShieldAlert, ArrowLeft, LogIn, KeyRound, CheckCircle2, ChevronRight, Lock } from "lucide-react";

interface RoleGuardProps {
  allowedRoles?: Role[];
  requiredPermission?: ClinicalPermission;
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export default function RoleGuard({
  allowedRoles,
  requiredPermission,
  children,
  fallbackTitle = "Access Restricted",
  fallbackMessage,
}: RoleGuardProps) {
  const { currentRole, currentUser, isGuest, setCurrentRole } = useClinic();
  const adminRoles: Role[] = ["system_admin", "tenant_admin"];
  const currentUserCanAccessAdmin =
    currentUser?.role === "system_admin" ||
    (currentUser?.role === "tenant_admin" && Boolean(currentUser?.isAdminGrantedBySuperAdmin));

  // 1. Guest Check
  if (isGuest) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <LogIn className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
              Authentication Required
            </div>
            <h2 className="text-xl font-extrabold text-white">Clinical Workspace Sign-In</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This module requires verified clinical staff or authenticated patient credentials. Please sign in with your enterprise credentials.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/signin"
              className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs text-center transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
            <button
              onClick={() => setCurrentRole(allowedRoles?.[0] || "physician")}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs text-center transition-all border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-4 h-4 text-teal-400" /> Demo Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Permission / Role Check
  let isAllowed = true;

  if (allowedRoles && allowedRoles.some((role) => adminRoles.includes(role))) {
    if (!currentUserCanAccessAdmin && currentUser?.role !== "system_admin") {
      isAllowed = false;
    }
  }

  if (requiredPermission) {
    isAllowed = hasPermission(currentRole, requiredPermission);
  } else if (allowedRoles && allowedRoles.length > 0) {
    isAllowed = allowedRoles.includes(currentRole);
  }

  if (!isAllowed) {
    const activeScope = getRoleScopeDetails(currentRole);
    const primaryPermittedRole = allowedRoles?.[0] || "physician";
    const recommendedScope = ROLE_CAPABILITIES_MATRIX[primaryPermittedRole];

    const defaultMsg =
      fallbackMessage ||
      `This module is restricted to authorized personnel (${
        allowedRoles
          ? allowedRoles.map((r) => ROLE_CAPABILITIES_MATRIX[r]?.label.split(" ")[0]).join(", ")
          : "credentialed clinicians"
      }) in compliance with hospital bylaws and HIPAA security rules.`;

    return (
      <div className="min-h-[65vh] flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-900/95 border border-rose-500/30 shadow-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">
                Scope of Practice Restriction
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{fallbackTitle}</h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            {defaultMsg}
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Role:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded-lg border text-[11px] ${activeScope.badgeBg} ${activeScope.accentColor} ${activeScope.borderColor}`}>
                {activeScope.label}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Prescribing Privileges:</span>
              <span className="text-slate-200 font-mono text-[11px]">{activeScope.prescribingLevel}</span>
            </div>
            <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
              {activeScope.clinicalPrivilegesSummary}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={
                currentRole === "patient"
                  ? "/patient/dashboard"
                  : currentRole === "system_admin" || currentRole === "tenant_admin" || currentRole === "auditor"
                  ? "/admin"
                  : "/"
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Your Workspace
            </Link>

            {/* In demo/dev mode allow testing with permitted role */}
            {allowedRoles && allowedRoles.length > 0 && (
              <button
                onClick={() => setCurrentRole(primaryPermittedRole)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-teal-500/40"
              >
                <KeyRound className="w-4 h-4" /> Switch to {recommendedScope?.label.split(" ")[0]}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
