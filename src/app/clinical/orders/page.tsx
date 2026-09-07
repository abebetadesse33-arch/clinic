"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClinicalOrderModal, { HospitalDepartment } from "@/components/clinical/ClinicalOrderModal";

export default function ClinicalOrdersPage() {
  const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const department = (params?.get("department") || "laboratory") as HospitalDepartment;
  const requestedPatientId = params?.get("patientId");
  const [patient, setPatient] = useState<{ id: string; firstName: string; lastName: string; mrn: string } | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPatient = async () => {
      try {
        if (!requestedPatientId) {
          if (active) setIsLoadingPatient(false);
          return;
        }
        const response = await fetch(`/api/v1/patients?limit=1&patientId=${encodeURIComponent(requestedPatientId)}`);
        const data = await response.json();
        const match = (data.data || [])[0];
        if (active && match) setPatient({ id: match.id, firstName: match.firstName, lastName: match.lastName, mrn: match.mrn });
      } catch {
        // The empty state below keeps the order page from submitting an invalid patient ID.
      } finally {
        if (active) setIsLoadingPatient(false);
      }
    };
    loadPatient();
    return () => { active = false; };
  }, [requestedPatientId]);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="px-4 pt-4 sm:px-8 sm:pt-8"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-teal-300 hover:text-teal-200"><ArrowLeft className="w-4 h-4" /> Back to workspace</Link></div>
      {isLoadingPatient ? (
        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">Loading patient record...</div>
      ) : patient ? (
        <ClinicalOrderModal pageMode patient={patient} initialDepartment={department} onClose={() => window.history.back()} />
      ) : (
        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-amber-500/30 bg-amber-950/20 p-8 text-center"><h1 className="text-lg font-bold text-amber-200">No patient selected</h1><p className="mt-2 text-sm text-slate-400">Open clinical orders from a patient chart or return to the workspace and select a valid patient.</p></div>
      )}
    </div>
  );
}