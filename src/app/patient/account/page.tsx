"use client";

import React, { useState, useEffect } from "react";
import { User, CreditCard, ShieldCheck, FileText, Users, Plus, CheckCircle2, Lock } from "lucide-react";

export default function PatientAccountPage() {
  const [activeTab, setActiveTab] = useState<"insurance" | "billing" | "family" | "security">("insurance");
  const [patientData, setPatientData] = useState<any>(null);
  const [regStatus, setRegStatus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/patient/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setPatientData(d.data);
        }
      })
      .catch(() => { });

    fetch("/api/v1/patient/registration-status")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setRegStatus(d.data);
        }
      })
      .catch(() => { });
  }, []);

  const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : "Active Account Holder";
  const patientMrn = patientData?.mrn || "MRN-ACTIVE";

  return (
    <div className="space-y-8 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <span className="badge-mint text-xs">Profile & Billing</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading mt-0.5">
          Account & Membership
        </h1>
        <p className="text-xs text-[#687B74]">
          Manage insurance coverage, payment methods, receipts, and clinical profile.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E7E2D8] pb-1 overflow-x-auto">
        {[
          { id: "insurance", label: "Insurance & Coverage", icon: ShieldCheck },
          { id: "billing", label: "Payment & Pass Validity", icon: CreditCard },
          { id: "family", label: "Account Profile", icon: Users },
          { id: "security", label: "Security & Login", icon: Lock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === id
                ? "bg-[#005C4B] text-white shadow-sm"
                : "bg-white text-[#33413C] border border-[#E7E2D8] hover:bg-[#FAF8F5]"
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Insurance */}
      {activeTab === "insurance" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-[#0B3B32] to-[#005C4B] text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-warm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#E8F4F0]/80">Primary Healthcare Coverage</span>
              <span className="badge-mint text-[10px] bg-white text-[#005C4B]">Active & Verified</span>
            </div>
            <div className="pt-2">
              <div className="text-xl font-bold font-display">NiniMed Integrated Health Shield</div>
              <div className="text-xs text-[#E8F4F0]/80 mt-0.5">Plan: Comprehensive Clinical Care & Telehealth</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#E8F4F0]/60 block font-sans">Patient MRN:</span>
                <span className="font-bold">{patientMrn}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#E8F4F0]/60 block font-sans">Coverage ID:</span>
                <span className="font-bold">COV-{patientMrn.replace("MRN-", "")}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#E8F4F0]/60 block font-sans">Consultation Copay:</span>
                <span className="font-bold">ETB 0.00</span>
              </div>
              <div>
                <span className="text-[10px] text-[#E8F4F0]/60 block font-sans">Triage & Messages:</span>
                <span className="font-bold">Included</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => alert("Upload insurance document dialog opened.")}
              className="btn-pill-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Update Insurance Card / Policy</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Billing */}
      {activeTab === "billing" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2D8] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#162E27]">3-Month Patient Registration Pass</h3>
                <p className="text-xs text-[#687B74]">
                  {regStatus?.isActive
                    ? `Pass is active with ${regStatus.daysRemaining} days remaining.`
                    : "Registration pass requires activation or renewal."}
                </p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${regStatus?.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                {regStatus?.isActive ? "Active Pass" : "Renewal Required"}
              </span>
            </div>
            <div className="pt-2 border-t border-[#F2EFE9] flex items-center justify-between text-xs">
              <span className="text-[#687B74]">Standard Registration Validity: <strong>90 Days (3 Months)</strong></span>
              <span className="font-bold text-[#162E27]">ETB {regStatus?.basePrice || 350}.00</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E7E2D8] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#687B74]">Invoice History</h3>
            <p className="text-xs text-[#687B74]">
              All payments through Telebirr, CBE Birr, Chapa, and Card appear in your real-time billing ledger.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Family / Account Profile */}
      {activeTab === "family" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-[#E7E2D8] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#162E27]">Verified Account Profile</h3>
            </div>
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#162E27] block">{patientName} (Primary Account Holder)</span>
                  <span className="text-[#687B74] text-[11px]">{patientData?.email || "patient@Ninimed.org"} • {patientMrn}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === "security" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E7E2D8] space-y-4 animate-fade-in text-xs">
          <h3 className="font-bold text-sm text-[#162E27]">Security & Authentication</h3>
          <div className="p-4 rounded-xl bg-[#E8F4F0] border border-[#B5DACF] flex items-center gap-3 text-[#005C4B]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Encrypted HIPAA/GDPR session token active with role-based access control.</span>
          </div>
          <div className="pt-2">
            <button
              onClick={() => alert("Security credentials are up to date.")}
              className="btn-pill-secondary text-xs"
            >
              Update Security Credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
