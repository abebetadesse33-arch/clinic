"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import PermissionGate from "../../components/auth/PermissionGate";
import { generateLabOrderPDF, generatePrescriptionPDF } from "../../lib/pdf/generator";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Stethoscope,
  Plus,
  Search,
  Filter,
  Pill,
  Activity,
  Lock,
} from "lucide-react";

export default function PrescriptionsHubPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "pharmacist",
        "system_admin",
        "tenant_admin",
        "auditor",
        "lab_technician",
      ]}
      fallbackTitle="Clinical Prescribing & Diagnostics Portal"
      fallbackMessage="Access to e-prescriptions and diagnostic requisitions is restricted to licensed physicians, nurse practitioners, pharmacists, lab scientists, and compliance auditors."
    >
      <PrescriptionsHubContent />
    </RoleGuard>
  );
}

function PrescriptionsHubContent() {
  const { prescriptions, labOrders, patients, currentUser } = useClinic();
  const [tab, setTab] = useState<"prescriptions" | "labs">("prescriptions");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRx = prescriptions.filter((rx) => {
    const p = patients.find((pat) => pat.id === rx.patientId);
    const patName = p ? `${p.firstName} ${p.lastName}` : "";
    return (
      rx.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredLabs = labOrders.filter((ord) => {
    const p = patients.find((pat) => pat.id === ord.patientId);
    const patName = p ? `${p.firstName} ${p.lastName}` : "";
    return (
      ord.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDownloadRxPDF = (rx: any) => {
    const patient = patients.find((p) => p.id === rx.patientId) || patients[0];
    generatePrescriptionPDF(rx, patient);
  };

  const handleDownloadLabPDF = (order: any) => {
    const patient = patients.find((p) => p.id === order.patientId) || patients[0];
    generateLabOrderPDF(order, patient);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Prescriptions & Diagnostic Orders Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official physician-authorized E-Prescriptions and laboratory orders with cryptographic audit trails and instant PDF generation.
          </p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setTab("prescriptions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "prescriptions"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Pill className="w-4 h-4" />
            Active E-Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setTab("labs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "labs"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Activity className="w-4 h-4" />
            Diagnostic Lab Orders ({labOrders.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Drug, Test, Patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* TAB 1: PRESCRIPTIONS LIST */}
      {tab === "prescriptions" && (
        <div className="space-y-3">
          {filteredRx.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center border border-slate-800">
              <p className="text-sm text-slate-400">No prescriptions found matching your search.</p>
            </div>
          ) : (
            filteredRx.map((rx) => {
              const patient = patients.find((p) => p.id === rx.patientId) || patients[0];
              return (
                <div
                  key={rx.id}
                  className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 mt-1">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{rx.medicationName}</h3>
                        <span className="text-xs font-bold text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">
                          {rx.dosage}
                        </span>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {rx.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        <strong>Sig:</strong> {rx.frequency} • Dispense: {rx.quantity} (Refills: {rx.refillsAllowed})
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Patient: <strong className="text-slate-200">{patient.firstName} {patient.lastName}</strong> (MRN: {patient.mrn}) | Prescriber: {rx.doctorName}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-3">
                        <span>Signed: {new Date(rx.signedAt || rx.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-mono text-teal-300/80">Token: {rx.prescriberSignature?.substring(0, 20)}...</span>
                      </div>
                    </div>
                  </div>

                  <PermissionGate
                    permission="prescribe_legend_drugs"
                    actionName="Sign / Download Rx"
                    fallback={
                      <button
                        onClick={() => handleDownloadRxPDF(rx)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                      >
                        <Download className="w-4 h-4 text-teal-400" />
                        View Rx Document
                      </button>
                    }
                  >
                    <button
                      onClick={() => handleDownloadRxPDF(rx)}
                      className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all hover:scale-105 self-end md:self-center whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Download Official Rx PDF
                    </button>
                  </PermissionGate>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: LAB ORDERS LIST */}
      {tab === "labs" && (
        <div className="space-y-3">
          {filteredLabs.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center border border-slate-800">
              <p className="text-sm text-slate-400">No laboratory orders found.</p>
            </div>
          ) : (
            filteredLabs.map((ord) => {
              const patient = patients.find((p) => p.id === ord.patientId) || patients[0];
              return (
                <div
                  key={ord.id}
                  className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mt-1">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{ord.testName}</h3>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          {ord.priority.toUpperCase()} Priority
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        <strong>Clinical Reason:</strong> {ord.clinicalReason}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Patient: <strong className="text-slate-200">{patient.firstName} {patient.lastName}</strong> (MRN: {patient.mrn}) | Ordering Clinician: {ord.doctorName}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-500">
                        Ordered: {new Date(ord.orderedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadLabPDF(ord)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:scale-105 self-end md:self-center whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    Download Lab Requisition PDF
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
