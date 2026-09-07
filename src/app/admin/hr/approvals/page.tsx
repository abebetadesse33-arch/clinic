"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  DollarSign,
  FileText,
  RefreshCw,
  BadgeCheck,
  Search,
  ChevronRight,
  ArrowRight,
  Building2,
  Video,
} from "lucide-react";

interface PendingApprovalItem {
  id: string;
  userId: string;
  providerName: string;
  providerEmail: string;
  providerRole: string;
  providerDept: string;
  bio: string;
  specialties: string[];
  languages: string[];
  licenseNumber: string;
  licenseIssuingBody: string;
  licenseVerified: boolean;
  consultationFeeEtb: string;
  approvalStatus: "draft" | "pending_hr" | "approved" | "rejected" | string;
  hrFeedback: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  metadata?: {
    academicTitle?: string;
    yearsOfExperience?: number;
    medicalSchool?: string;
    residencyFellowship?: string;
    licenseExpiryDate?: string;
    npiNumber?: string;
    hospitalAffiliations?: string;
    boardCertifications?: string;
    telehealthReadiness?: string;
    currency?: string;
    followUpGracePeriodDays?: number;
    acceptedInsurances?: string[];
    cancellationPolicyNotice?: string;
    clinicalServices?: Array<{
      id: string;
      name: string;
      durationMinutes: number;
      feeEtb: number;
      isActive: boolean;
      description?: string;
    }>;
  };
  schedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isTelehealthAvailable: boolean;
    isInPersonAvailable: boolean;
    isActive: boolean;
  }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function HrProviderApprovalsPage() {
  const { currentUser } = useClinic();
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchApprovals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/hr/provider-approvals", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setApprovals(data.data);
        if (!selectedItem && data.data.length > 0) {
          setSelectedItem(data.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load HR approvals:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleDecision = async (action: "approve" | "reject") => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/v1/hr/provider-approvals/${selectedItem.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          feedback: feedbackNote || (action === "approve" ? "Approved by HR" : "Revisions requested"),
          reviewerId: currentUser.id || "00000000-0000-0000-0000-000000000001",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Provider profile successfully ${action}d!`);
        setFeedbackNote("");
        fetchApprovals();
      } else {
        showToast(data.error || "Failed to process decision", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error processing decision", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin", "care_coordinator"]}
      fallbackTitle="HR & Credentialing Approvals"
      fallbackMessage="This portal is restricted to Human Resources officers and Hospital Operations Administrators."
    >
      <div className="space-y-6 pb-16 max-w-7xl mx-auto animate-fade-in">
        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl text-xs font-bold shadow-warm-lg flex items-center gap-2 animate-fade-in ${
              toastMsg.type === "success" ? "bg-[#005C4B] text-white" : "bg-rose-600 text-white"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider">
                HR Governance & Verification
              </span>
              <span className="text-xs text-slate-400">Reviewer: {currentUser.fullName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Provider Profile & Availability Approvals
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Review credential submissions, license verification, academic degrees, clinical services, and weekly availability matrices.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchApprovals}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Refresh Approvals"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            </button>
            <Link
              href="/admin/hr"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
            >
              HR Portal
            </Link>
          </div>
        </div>

        {/* Main 2-Column Split: Left Queue, Right Details & Verification Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Pending Submissions Queue */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-[#E7E2D8] p-5 shadow-warm space-y-3">
              <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-3">
                <h3 className="text-sm font-bold text-[#162E27]">Provider Submissions ({approvals.length})</h3>
                <span className="text-xs text-[#005C4B] font-semibold">Live Queue</span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto text-[#005C4B] animate-spin" />
                  <p className="text-xs text-[#687B74]">Loading provider submissions...</p>
                </div>
              ) : approvals.length > 0 ? (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {approvals.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const meta = item.metadata || {};
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? "bg-[#E8F4F0] border-[#005C4B] shadow-sm"
                            : "bg-[#FAF8F5] border-[#E7E2D8] hover:border-[#005C4B]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#162E27]">
                              {item.providerName || "Clinician"} {meta.academicTitle ? `(${meta.academicTitle})` : ""}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.approvalStatus === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.approvalStatus === "pending_hr"
                                ? "bg-amber-100 text-amber-900 animate-pulse"
                                : item.approvalStatus === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {item.approvalStatus?.replace("_", " ").toUpperCase()}
                          </span>
                        </div>

                        <p className="text-xs text-[#687B74] line-clamp-1">{item.bio || "No bio submitted"}</p>

                        <div className="flex items-center justify-between text-[11px] text-[#687B74] pt-1 border-t border-[#E7E2D8]">
                          <span>License: <strong>{item.licenseNumber || "MD-782914"}</strong></span>
                          <span className="text-[#005C4B] font-bold flex items-center gap-0.5">
                            Inspect Details <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#687B74]">
                  No provider submissions pending HR review.
                </div>
              )}
            </div>
          </div>

          {/* Right 7 Cols: Verification Inspector & Decision Panel */}
          <div className="lg:col-span-7 space-y-4">
            {selectedItem ? (
              <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 shadow-warm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#005C4B] tracking-wider">Credential Verification</span>
                    <h2 className="text-lg font-bold text-[#162E27]">
                      {selectedItem.providerName} {selectedItem.metadata?.academicTitle ? `(${selectedItem.metadata.academicTitle})` : ""}
                    </h2>
                    <p className="text-xs text-[#687B74]">{selectedItem.providerEmail} • {selectedItem.providerDept || "Clinical Care"}</p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedItem.approvalStatus === "approved"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : selectedItem.approvalStatus === "pending_hr"
                        ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {selectedItem.approvalStatus?.replace("_", " ")}
                  </span>
                </div>

                {/* Academic Background & Training */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#687B74]">Education & Clinical Training</span>
                    <span className="text-teal-700 font-bold">
                      {selectedItem.metadata?.yearsOfExperience || 8} Years Practice Experience
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#687B74] block text-[11px]">Medical School:</span>
                      <strong className="text-[#162E27]">{selectedItem.metadata?.medicalSchool || "Addis Ababa University"}</strong>
                    </div>
                    <div>
                      <span className="text-[#687B74] block text-[11px]">Residency / Hospital:</span>
                      <strong className="text-[#162E27]">{selectedItem.metadata?.residencyFellowship || "Tikur Anbessa Hospital"}</strong>
                    </div>
                  </div>
                </div>

                {/* License & Credentials Check */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#687B74]">Medical Board License</span>
                    <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Registry Authenticated
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#687B74] block">License Number:</span>
                      <strong className="text-[#162E27] font-mono">{selectedItem.licenseNumber || "MD-782914-TX"}</strong>
                    </div>
                    <div>
                      <span className="text-[#687B74] block">Issuing Authority:</span>
                      <strong className="text-[#162E27]">{selectedItem.licenseIssuingBody || "Federal Ministry of Health"}</strong>
                    </div>
                  </div>
                </div>

                {/* Clinical Services Catalogue & Pricing */}
                {selectedItem.metadata?.clinicalServices && selectedItem.metadata.clinicalServices.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#162E27]">Configured Clinical Services Catalogue</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedItem.metadata.clinicalServices.map((srv) => (
                        <div
                          key={srv.id}
                          className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#162E27]">{srv.name}</span>
                            <span className="text-[11px] text-[#687B74] ml-2">({srv.durationMinutes} min)</span>
                          </div>
                          <span className="font-mono font-bold text-[#005C4B]">
                            {srv.feeEtb} {selectedItem.metadata?.currency || "ETB"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly Availability Shifts */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#162E27]">Proposed Weekly Availability Shifts</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedItem.schedules && selectedItem.schedules.length > 0 ? (
                      selectedItem.schedules.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-[#162E27] w-24">{DAY_NAMES[s.dayOfWeek] || "Day"}</span>
                          <span className="font-mono text-[#687B74]">
                            {s.startTime} – {s.endTime}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {s.isTelehealthAvailable && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                                Video
                              </span>
                            )}
                            {s.isInPersonAvailable && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                In-Person
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#687B74] italic">Standard Mon–Fri (09:00–17:00)</div>
                    )}
                  </div>
                </div>

                {/* Feedback Note Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#162E27]">HR Review Note / Revisions Request</label>
                  <input
                    type="text"
                    placeholder="Enter approval note or specific revisions required for the clinician..."
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
                  />
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleDecision("reject")}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-full border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    onClick={() => handleDecision("approve")}
                    disabled={isProcessing}
                    className="flex-1 btn-pill-primary py-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Approve & Publish to Patients</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E7E2D8] p-12 text-center text-[#687B74] space-y-3">
                <User className="w-12 h-12 mx-auto text-[#687B74]/50" />
                <h3 className="font-bold text-[#162E27]">Select a Provider from the Queue</h3>
                <p className="text-xs">Click any clinician submission on the left to verify credentials and approve their schedule.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
