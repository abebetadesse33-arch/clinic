"use client";

import React, { useState, useEffect } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Building2,
  Users,
  UserPlus,
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Send,
  Trash2,
  FileText,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function CompanyPortalPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "system_admin",
        "tenant_admin",
        "auditor",
        "physician",
        "care_coordinator",
      ]}
      fallbackTitle="Corporate Employer & Occupational Health Portal"
      fallbackMessage="Access to corporate wellness plans and employer workforce utilization telemetry is restricted to operations administrators and designated occupational health liaisons."
    >
      <CompanyPortalContent />
    </RoleGuard>
  );
}

function CompanyPortalContent() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companyData, setCompanyData] = useState<any>(null);
  const [utilizationData, setUtilizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteDept, setInviteDept] = useState("Engineering");
  const [inviteEmpId, setInviteEmpId] = useState("");

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCompanies = async () => {
    try {
      const res = await fetch("/api/v1/companies").then((r) => r.json());
      if (res.success && res.data.length > 0) {
        setCompanies(res.data);
        const compId = selectedCompanyId || res.data[0].company.id;
        setSelectedCompanyId(compId);
        fetchCompanyDetail(compId);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchCompanyDetail = async (id: string) => {
    setLoading(true);
    try {
      const [compRes, utilRes] = await Promise.all([
        fetch(`/api/v1/companies/${id}`).then((r) => r.json()),
        fetch(`/api/v1/companies/${id}/reports/utilization`).then((r) => r.json()),
      ]);

      if (compRes.success) setCompanyData(compRes.data);
      if (utilRes.success) setUtilizationData(utilRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !selectedCompanyId) return;

    try {
      const res = await fetch(`/api/v1/companies/${selectedCompanyId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          phone: invitePhone,
          department: inviteDept,
          employeeIdNumber: inviteEmpId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        notify(`Invitation generated for ${inviteEmail}! Claim Token: ${data.data.token}`);
        setShowInviteModal(false);
        setInviteEmail("");
        setInvitePhone("");
        setInviteEmpId("");
        fetchCompanyDetail(selectedCompanyId);
      } else {
        notify(`Error: ${data.error}`);
      }
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    }
  };

  const handleRemoveEmployee = async (patientId: string) => {
    if (!confirm("Are you sure you want to revoke this employee's healthcare benefit seat?")) return;
    try {
      const res = await fetch(`/api/v1/companies/${selectedCompanyId}/employees/${patientId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        notify("Employee seat released successfully.");
        fetchCompanyDetail(selectedCompanyId);
      }
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500/90 backdrop-blur border border-emerald-400 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-slate-400">
                Corporate Benefits & HR Portal
              </h1>
              <p className="text-sm text-slate-400">
                Employee healthcare onboarding, seat allocations, and anonymized utilization metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {companies.length > 1 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  fetchCompanyDetail(e.target.value);
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.company.id} value={c.company.id}>
                    {c.company.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-600/25 transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Employee</span>
            </button>
          </div>
        </div>

        {/* Top Analytics Cards */}
        {companyData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Plan & Status</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white">
                {companyData.subscription?.plan?.name || "Corporate Enterprise"}
              </div>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Coverage
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Seat Utilization</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                {companyData.stats.usedSeats} / {companyData.stats.totalSeats}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {companyData.stats.availableSeats} available ({companyData.stats.pendingInvites} pending invites)
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Services Consumed</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                {utilizationData?.summary?.totalClaims || 0}
              </div>
              <p className="text-xs text-cyan-400 mt-1">Consultations & Labs Covered</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Covered Healthcare Value</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                {utilizationData?.summary?.totalCoveredValueETB || 0} ETB
              </div>
              <p className="text-xs text-emerald-400 mt-1">Saved for Employees</p>
            </div>
          </div>
        )}

        {/* Main Grid: Active Employees & Privacy-Safe Utilization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Employee Roster */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" /> Active Enrolled Employees ({companyData?.employees?.length || 0})
              </h2>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Employee Name</th>
                    <th className="p-4">MRN</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Enrolled Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {companyData?.employees?.map((emp: any) => (
                    <tr key={emp.member.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-semibold text-white">
                        {emp.patient.firstName} {emp.patient.lastName}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{emp.patient.mrn}</td>
                      <td className="p-4">
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-purple-500/20">
                          {emp.member.department || "General"}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(emp.member.addedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveEmployee(emp.patient.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition"
                          title="Revoke Seat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!companyData?.employees || companyData.employees.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No employees currently enrolled. Invite employees to allocate seats.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pending Invitations Table */}
            {companyData?.invitations?.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Pending Invitations ({companyData.invitations.filter((i: any) => i.status === "pending").length})
                </h3>
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl divide-y divide-slate-800/60 text-sm">
                  {companyData.invitations.map((inv: any) => (
                    <div key={inv.id} className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-200">{inv.email}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{inv.department}</span> •{" "}
                          <span>Token: <span className="font-mono text-indigo-300">{inv.token.slice(0, 10)}...</span></span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Privacy-Safe Utilization & Invoices */}
          <div className="space-y-6">
            {/* Aggregated Utilization */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" /> Benefit Breakdown
                </h3>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  HIPAA / PHI Safe
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aggregated service claims without exposing employee medical diagnoses or clinical notes.
              </p>

              <div className="space-y-3 pt-2">
                {utilizationData?.serviceBreakdown?.map((item: any) => (
                  <div key={item.serviceType} className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200 capitalize">
                        {item.serviceType.replace("_", " ")}
                      </span>
                      <span className="block text-xs text-slate-400">{item.totalQuantity} encounters covered</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">
                      {item.totalCoveredAmount} ETB
                    </span>
                  </div>
                ))}

                {(!utilizationData?.serviceBreakdown || utilizationData.serviceBreakdown.length === 0) && (
                  <div className="text-xs text-slate-500 text-center py-4">
                    No services claimed in current billing period.
                  </div>
                )}
              </div>
            </div>

            {/* Corporate Invoices */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" /> Invoices & Wire Transfers
              </h3>
              <div className="space-y-2.5 text-sm">
                {companyData?.invoices?.map((inv: any) => (
                  <div key={inv.id} className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-indigo-300">{inv.invoiceNumber}</div>
                      <div className="text-xs text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{inv.totalAmount} {inv.currency}</div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        inv.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Invite Employee */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-400" /> Invite Employee to Benefits
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Employee Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="employee@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number (SMS Claim Link)
                  </label>
                  <input
                    type="tel"
                    placeholder="+251 91 100 0000"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Operations"
                      value={inviteDept}
                      onChange={(e) => setInviteDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Employee ID / Badge
                    </label>
                    <input
                      type="text"
                      placeholder="EMP-409"
                      value={inviteEmpId}
                      onChange={(e) => setInviteEmpId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl font-medium transition"
                  >
                    Dispatch Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
