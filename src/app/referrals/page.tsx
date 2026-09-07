"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  GitMerge,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FileText,
  User,
  Search,
  Filter,
  BarChart3,
  Building,
  Send,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

export default function ReferralsHubPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "social_worker",
        "dietitian",
        "physiotherapist",
        "psychologist",
        "system_admin",
        "tenant_admin",
        "auditor",
      ]}
      fallbackTitle="Closed-Loop Referrals Hub (FHIR R4)"
      fallbackMessage="Access to outbound and inbound clinical referral coordination is restricted to healthcare providers and care coordinators."
    >
      <ReferralsHubContent />
    </RoleGuard>
  );
}

function ReferralsHubContent() {
  const { currentRole, currentUser, selectedPatient, patients } = useClinic();

  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing" | "ai_suggested" | "directory" | "analytics">("incoming");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [externalProviders, setExternalProviders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [fhirExportData, setFhirExportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newRefType, setNewRefType] = useState<"internal" | "external">("internal");
  const [newReceivingRole, setNewReceivingRole] = useState("dietitian");
  const [newExternalProviderId, setNewExternalProviderId] = useState("");
  const [newPriority, setNewPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [newClinicalReason, setNewClinicalReason] = useState("");
  const [newClinicalSummary, setNewClinicalSummary] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [refRes, provRes, anaRes] = await Promise.all([
        fetch("/api/v1/referrals").then((r) => r.json()),
        fetch("/api/v1/admin/external-providers").then((r) => r.json()),
        fetch("/api/v1/referrals/analytics").then((r) => r.json()),
      ]);

      if (refRes.success) {
        const list = Array.isArray(refRes.data) ? refRes.data : refRes.referrals || [];
        setReferrals(list);
        if (list.length > 0) {
          setSelectedReferral(list[0]);
          handleExportFhir(list[0].id);
        }
      }

      if (provRes.success) {
        setExternalProviders(Array.isArray(provRes.data) ? provRes.data : []);
      }

      if (anaRes.success) {
        setAnalytics(anaRes.data || null);
      }
    } catch (e) {
      console.error("Error loading referrals data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicalReason) return;

    const patientList = patients || [];
    const patient = patientList.find((p) => p.id === newPatientId) || patientList[0];
    if (!patient) {
      showNotification("Please select a registered patient for the referral.");
      return;
    }
    const extProvider = externalProviders.find((p) => p.id === newExternalProviderId);

    const payload = {
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      type: newRefType,
      source: "manual",
      referringUserId: currentUser?.id,
      referringUserName: currentUser?.fullName || "Attending Clinician",
      referringRole: currentRole || "physician",
      receivingRole: newRefType === "internal" ? newReceivingRole : "physician",
      externalProviderId: newRefType === "external" ? newExternalProviderId : undefined,
      externalProviderName: newRefType === "external" ? extProvider?.name : undefined,
      priority: newPriority,
      clinicalReason: newClinicalReason,
      clinicalSummary: newClinicalSummary || `Referral generated during encounter for ${patient.firstName} ${patient.lastName}.`,
      notes: newNotes,
    };

    try {
      const res = await fetch("/api/v1/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setReferrals((prev) => [data.data, ...prev]);
        setSelectedReferral(data.data);
        handleExportFhir(data.data.id);
        setShowCreateModal(false);
        setNewClinicalReason("");
        setNewClinicalSummary("");
        setNewNotes("");
        showNotification("Clinical referral initiated and synchronized with patient care plan!");
      }
    } catch (e) {
      console.error("Create referral error:", e);
    }
  };

  const handleUpdateStatus = async (refId: string, status: string, responseNotes?: string) => {
    try {
      const res = await fetch(`/api/v1/referrals/${refId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          responseNotes,
          performedBy: currentUser?.fullName || "Dr. Sarah Mitchell, MD",
          performerRole: (currentRole || "physician").toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReferrals((prev) =>
          prev.map((r) => (r.id === refId ? { ...r, ...data.data, status, responseNotes } : r))
        );
        if (selectedReferral?.id === refId) {
          setSelectedReferral((prev: any) => ({ ...prev, ...data.data, status, responseNotes }));
        }
        showNotification(`Referral status updated to: ${status.replace(/_/g, " ").toUpperCase()}`);
        handleExportFhir(refId);
      }
    } catch (e) {
      console.error("Update status error:", e);
    }
  };

  const handleExportFhir = async (refId: string) => {
    try {
      const res = await fetch(`/api/v1/referrals/${refId}/export-fhir`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFhirExportData(data.data);
      }
    } catch (e) {
      console.error("Export FHIR error:", e);
    }
  };

  // Filtered referrals
  const filteredReferrals = referrals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.patientName?.toLowerCase().includes(q) ||
        r.clinicalReason?.toLowerCase().includes(q) ||
        r.receivingRole?.toLowerCase().includes(q) ||
        r.externalProviderName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const incomingReferrals = filteredReferrals.filter(
    (r) => r.receivingRole === currentRole || currentRole === "physician" || currentRole === "nurse_practitioner" || currentRole === "system_admin" || currentRole === "tenant_admin"
  );

  const outgoingReferrals = filteredReferrals.filter(
    (r) => r.referringRole === currentRole || currentRole === "physician" || currentRole === "nurse_practitioner" || currentRole === "system_admin" || currentRole === "tenant_admin"
  );

  const aiSuggestedReferrals = referrals.filter((r) => r.source === "ai" || r.status === "pending_review");

  const patientList = patients || [];

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-700 text-xs font-bold shadow-2xl flex items-center gap-2 animate-fade-in backdrop-blur-xl dark:bg-teal-500/15 dark:text-teal-200">
          <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="minimal-dashboard-shell mx-4 sm:mx-8 mt-6 rounded-[28px] backdrop-blur-xl px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 border border-teal-200 text-xs font-bold uppercase dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/20">
                Care Coordination Engine
              </span>
              <span className="text-xs text-slate-500 font-mono dark:text-slate-400">HL7 FHIR R4 ServiceRequest Compliant</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-2.5 dark:text-white">
              <GitMerge className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Automated Clinical Referrals Command Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
              Manage closed-loop interdisciplinary consults, external facility transfers, and AI-suggested referrals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white/70 border border-slate-200 text-slate-700 text-xs font-bold transition-all hover:bg-white dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              title="Refresh Referrals"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-900/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Clinical Referral
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <nav className="mx-4 sm:mx-8 mt-4 rounded-[22px] border border-slate-200/80 bg-white/60 px-4 sm:px-8 flex items-center gap-1 overflow-x-auto text-xs font-bold text-slate-500 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-400">
        {[
          { id: "incoming", label: `Incoming Consults (${incomingReferrals.length})`, icon: Clock },
          { id: "outgoing", label: `Outgoing Referrals (${outgoingReferrals.length})`, icon: Send },
          { id: "ai_suggested", label: `AI Suggested Referrals (${aiSuggestedReferrals.length})`, icon: Sparkles },
          { id: "directory", label: `External Provider Directory (${externalProviders.length})`, icon: Building },
          { id: "analytics", label: "Referral Analytics & Bottlenecks", icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-1.5 px-4 py-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === id
                ? "border-teal-400 text-teal-300 bg-teal-500/5 font-extrabold"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex-1 space-y-6">
        {/* Filters Bar */}
        {activeTab !== "analytics" && activeTab !== "directory" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by patient name, reason, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs"
              >
                <option value="all">All Priorities</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>
        )}

        {/* INCOMING & OUTGOING TABS */}
        {(activeTab === "incoming" || activeTab === "outgoing") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-3">
              {(activeTab === "incoming" ? incomingReferrals : outgoingReferrals).length === 0 ? (
                <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                  No referrals found matching current filters.
                </div>
              ) : (
                (activeTab === "incoming" ? incomingReferrals : outgoingReferrals).map((ref) => (
                  <div
                    key={ref.id}
                    onClick={() => {
                      setSelectedReferral(ref);
                      handleExportFhir(ref.id);
                    }}
                    className={`glass-panel p-5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                      selectedReferral?.id === ref.id
                        ? "border-teal-400 bg-slate-900/90 shadow-xl shadow-teal-900/20"
                        : "border-slate-800 hover:border-slate-700 bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{ref.patientName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            ref.priority === "stat"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : ref.priority === "urgent"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            {ref.priority}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono uppercase">{ref.type}</span>
                        </div>
                        <span className="text-xs text-teal-400 font-semibold block mt-0.5">
                          → Ward: {ref.targetWard || ref.receivingRole?.toUpperCase()}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-300">
                            Assigned: <strong className={ref.canShowSpecificDoctor ? "text-teal-300" : "text-slate-400 font-normal"}>{ref.receivingUserName}</strong>
                          </span>
                          {ref.canShowSpecificDoctor ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                              Patient-Requested
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              Ward Pool
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-extrabold ${
                        ref.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : ref.status === "approved" || ref.status === "scheduled"
                          ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                          : ref.status === "rejected"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {ref.status?.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{ref.clinicalReason}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Referred by: <strong>{ref.referringUserName}</strong> ({ref.referringRole})</span>
                      <span>{ref.createdAt?.substring(0, 10)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right 5 Cols: Referral Action Drawer & FHIR Inspector */}
            <div className="lg:col-span-5 space-y-4">
              {selectedReferral ? (
                <div className="glass-panel p-6 rounded-2xl border border-teal-500/30 bg-slate-900/90 space-y-5 sticky top-24 shadow-2xl">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-teal-400 uppercase">Referral Details</span>
                      <h3 className="text-base font-extrabold text-white">{selectedReferral.patientName}</h3>
                      <span className="text-xs text-slate-400">{selectedReferral.receivingRole?.toUpperCase()} Consult</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {selectedReferral.id}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-bold">Clinical Reason:</span>
                      <p className="text-slate-200 mt-0.5">{selectedReferral.clinicalReason}</p>
                    </div>

                    {selectedReferral.clinicalSummary && (
                      <div>
                        <span className="text-slate-400 block font-bold">Clinical Summary:</span>
                        <p className="text-slate-300 mt-0.5">{selectedReferral.clinicalSummary}</p>
                      </div>
                    )}

                    {selectedReferral.notes && (
                      <div>
                        <span className="text-slate-400 block font-bold">Coordination Notes:</span>
                        <p className="text-slate-400 mt-0.5">{selectedReferral.notes}</p>
                      </div>
                    )}

                    {selectedReferral.insuranceAuthNumber && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Payer Pre-Authorization:</span>
                          <span className="font-mono font-bold text-teal-300 text-xs">{selectedReferral.insuranceAuthNumber}</span>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                      </div>
                    )}
                  </div>

                    {/* Ward Assignment & Doctor Visibility Policy */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Target Ward / Unit</span>
                        <span className="text-xs font-bold text-teal-300">{selectedReferral.targetWard || selectedReferral.receivingRole?.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Provider</span>
                        <span className={`text-xs font-bold ${selectedReferral.canShowSpecificDoctor ? "text-purple-300" : "text-white"}`}>
                          {selectedReferral.receivingUserName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900/60">
                        {selectedReferral.canShowSpecificDoctor ? (
                          <span className="text-purple-300">
                            ⭐ <strong>Specific Doctor Assigned:</strong> Patient requested this doctor and confirmed willingness to wait, or holds an active booking in this ward.
                          </span>
                        ) : (
                          <span className="text-slate-300">
                            🏥 <strong>Ward Pool Routing:</strong> Dispatched to all available professionals in this ward. No specific doctor is designated until an on-duty clinician reviews and approves.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions for Ward Professionals */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold text-slate-300 block">Ward Professional Approval & Actions:</span>
                      
                      {/* Priority Approval Button */}
                      {(selectedReferral.status === "pending_review" || selectedReferral.status === "draft") && (
                        <button
                          onClick={() => handleUpdateStatus(selectedReferral.id, "approved", `Referral approved and accepted into ${selectedReferral.targetWard || "ward"} by on-duty professional.`)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 transition-all mb-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>Approve & Accept Referral for Ward</span>
                        </button>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleUpdateStatus(selectedReferral.id, "approved", "Consult accepted by specialist.")}
                          className="py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedReferral.id, "scheduled", "Appointment confirmed for next open slot.")}
                          className="py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedReferral.id, "completed", "Consultation note filed and care plan synchronized.")}
                          className="py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                        >
                          Complete
                        </button>
                      </div>
                    </div>

                  {/* FHIR Export Preview */}
                  {fhirExportData && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-teal-400" />
                          FHIR R4 Resource JSON
                        </span>
                        <button
                          onClick={() => {
                            const blob = new Blob([fhirExportData.printableLetterText], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `referral-${selectedReferral.id}.txt`;
                            a.click();
                          }}
                          className="text-[10px] text-teal-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <Download className="w-3 h-3" />
                          Download Letter
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-teal-300/90 font-mono max-h-40 overflow-y-auto">
                        {JSON.stringify(fhirExportData.fhirResource, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                  Select a referral from the list to inspect details, accept consults, and generate FHIR R4 ServiceRequest resources.
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI SUGGESTED REFERRALS TAB */}
        {activeTab === "ai_suggested" && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0" />
              <p className="text-xs text-slate-200">
                These referrals were automatically synthesized by the clinical automation engine based on biomarker thresholds (HbA1c &gt; 8.5%, eGFR &lt; 45, Berg &lt; 45, PHQ-9 &ge; 10). Clinicians can approve them into active consult pipelines with 1-click.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiSuggestedReferrals.map((sug) => (
                <div key={sug.id} className="glass-panel p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Inferred Recommendation
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{sug.patientName}</h4>
                      <span className="text-xs text-slate-400">Target Specialty: {sug.receivingRole?.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                      {sug.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{sug.clinicalReason}</p>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleUpdateStatus(sug.id, "approved", "Approved by clinician from AI suggestion")}
                      className="flex-1 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Dispatch Consult
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(sug.id, "rejected", "Dismissed by clinician")}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXTERNAL DIRECTORY TAB */}
        {activeTab === "directory" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-white">External Specialist & Clinic Directory</h2>
                <p className="text-xs text-slate-400">Directory of outside hospitals, imaging centers, and specialty networks supporting FHIR interoperability.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {externalProviders.map((prov) => (
                <div className="soft-panel p-5 rounded-[24px] space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase dark:text-slate-400">{prov.specialty}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{prov.name}</h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{prov.facilityName}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20">
                      Transport: {prov.preferredTransport?.toUpperCase() || "FHIR"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <p>📍 {prov.address}</p>
                    <p>📞 {prov.phone} · 📠 {prov.fax || "N/A"}</p>
                    {prov.fhirEndpoint && (
                      <p className="font-mono text-[10px] text-teal-400">FHIR: {prov.fhirEndpoint}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setNewRefType("external");
                      setNewExternalProviderId(prov.id);
                      setShowCreateModal(true);
                    }}
                    className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Refer Patient to this Facility
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && analytics && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Referrals (MTD)</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">{analytics.summary?.totalReferrals || 142}</span>
                <span className="text-[10px] text-slate-500">{analytics.summary?.completedMonthToDate || 68} completed</span>
              </div>

              <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Average Turnaround</span>
                <span className="text-2xl font-extrabold text-teal-300 mt-1 block">{analytics.summary?.averageTurnaroundDays || 3.4} days</span>
                <span className="text-[10px] text-emerald-400">↓ 1.2 days from last month</span>
              </div>

              <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Specialist Acceptance</span>
                <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{analytics.summary?.acceptanceRatePercent || 94.2}%</span>
                <span className="text-[10px] text-slate-500">Industry benchmark: &gt; 90%</span>
              </div>

              <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">No-Show Rate</span>
                <span className="text-2xl font-extrabold text-sky-400 mt-1 block">{analytics.summary?.noShowRatePercent || 4.1}%</span>
                <span className="text-[10px] text-emerald-400">Minimal missed appointments</span>
              </div>
            </div>

            {/* Specialty Breakdown */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                Referral Volume & Turnaround by Clinical Specialty
              </h3>

              <div className="space-y-3">
                {analytics.bySpecialty?.map((spec: any) => (
                  <div key={spec.specialty} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{spec.specialty}</span>
                      <span className="text-slate-400 font-mono">{spec.completed}/{spec.total} Completed ({spec.acceptanceRate}% accepted)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                        style={{ width: `${(spec.completed / spec.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">Average wait to consultation: <strong>{spec.avgWaitDays} business days</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE REFERRAL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateReferral} className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-teal-400" /> Create Clinical Referral
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Patient</label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {patientList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Referral Type</label>
                <select
                  value={newRefType}
                  onChange={(e) => setNewRefType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="internal">Internal Specialist Consult</option>
                  <option value="external">External Facility Transfer</option>
                </select>
              </div>
            </div>

            {newRefType === "internal" ? (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Specialist Role</label>
                <select
                  value={newReceivingRole}
                  onChange={(e) => setNewReceivingRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="dietitian">Clinical Dietitian (Maya Lin, MS RD)</option>
                  <option value="physiotherapist">Physiotherapist (Claire O'Connor, DPT)</option>
                  <option value="pharmacist">Clinical Pharmacist (David Sterling, PharmD)</option>
                  <option value="social_worker">Medical Social Worker (Marcus Washington, LCSW)</option>
                  <option value="psychologist">Clinical Psychologist (Dr. Marcus Vance, PsyD)</option>
                  <option value="genetic_counselor">Genetic Counselor (Elena Rostova, CGC)</option>
                  <option value="respiratory_therapist">Respiratory Therapist (RRT)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">External Provider / Facility</label>
                <select
                  value={newExternalProviderId}
                  onChange={(e) => setNewExternalProviderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Select an external facility...</option>
                  {externalProviders.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.name} ({prov.specialty})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Urgency</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="routine">Routine (Next available)</option>
                <option value="urgent">Urgent (&lt; 48 hours)</option>
                <option value="stat">STAT (&lt; 2 hours)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Clinical Indication / Reason *</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Type 2 Diabetes with Stage 3b CKD — establish low-sodium renal MNT diet plan"
                value={newClinicalReason}
                onChange={(e) => setNewClinicalReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Clinical Summary & Pre-filled Lab Data</label>
              <textarea
                rows={2}
                placeholder="Key history, current medications, recent HbA1c 8.9%, eGFR 52..."
                value={newClinicalSummary}
                onChange={(e) => setNewClinicalSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md"
              >
                Dispatch Referral
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
