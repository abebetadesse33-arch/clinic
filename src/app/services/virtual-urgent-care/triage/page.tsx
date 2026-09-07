"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

// Lazy import the full treat-me-now experience
import dynamic from "next/dynamic";

const TreatMeNowContent = dynamic(
  () => import("@/components/treat-me-now/TreatMeNowFlow"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-teal-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-semibold">Initializing 24/7 Virtual Care…</span>
      </div>
    ),
  }
);

function TriageGuard() {
  const router = useRouter();
  const { isAuthenticated, authResolved } = useClinic();

  useEffect(() => {
    if (authResolved && !isAuthenticated) {
      router.replace(
        "/signin?redirect=" + encodeURIComponent("/services/virtual-urgent-care/triage")
      );
    }
  }, [authResolved, isAuthenticated, router]);

  if (!authResolved || !isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-teal-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-semibold">Verifying session…</span>
      </div>
    );
  }

  return <TreatMeNowContent />;
}

export default function VirtualUrgentCareTriagePage() {
  return (
    <div>
      <div className="px-4 pt-4 sm:px-8 sm:pt-6">
        <Link
          href="/services/virtual-urgent-care"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#005C4B] hover:text-[#0B3B32] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Virtual Urgent Care
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center gap-3 text-teal-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-semibold">Loading…</span>
          </div>
        }
      >
        <TriageGuard />
      </Suspense>
    </div>
  );
}
