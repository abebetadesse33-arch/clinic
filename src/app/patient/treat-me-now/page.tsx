"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import TreatMeNowFlow from "@/components/treat-me-now/TreatMeNowFlow";

function PatientTreatMeNowGuard() {
  const router = useRouter();
  const { isAuthenticated, currentRole } = useClinic();

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace(`/signin?redirect=${encodeURIComponent("/patient/treat-me-now")}`);
    }
  }, [isAuthenticated, currentRole, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center gap-3 text-teal-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Verifying your session…</span>
      </div>
    );
  }

  return (
    <TreatMeNowFlow
      returnPath="/patient/treat-me-now"
    />
  );
}

export default function TreatMeNowPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400 text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Initializing Treat Me Now™ 24/7 Virtual Center...</span>
        </div>
      }
    >
      <PatientTreatMeNowGuard />
    </Suspense>
  );
}
