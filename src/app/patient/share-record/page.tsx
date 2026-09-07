"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ShareMedicalRecordModal from "@/components/patient/ShareMedicalRecordModal";

export default function ShareRecordPage() {
  const patientId = typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("patientId") || undefined;
  return <div><div className="px-4 pt-4 sm:px-8 sm:pt-8 bg-slate-950"><Link href="/patient/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-teal-300"><ArrowLeft className="w-4 h-4" /> Back to patient dashboard</Link></div><ShareMedicalRecordModal pageMode isOpen onClose={() => window.history.back()} patientId={patientId} /></div>;
}