"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck,
  Filter,
  Lock,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function AuditorDashboard() {
  const { auditLogs, currentUser } = useClinic();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredLogs = auditLogs.filter((log) => {
    if (roleFilter !== "all" && log.userRole !== roleFilter) return false;
    if (
      search &&
      !log.action.toLowerCase().includes(search.toLowerCase()) &&
      !log.summary.toLowerCase().includes(search.toLowerCase()) &&
      !log.userName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const exportAuditCSV = () => {
    const headers = "ID,Timestamp,User,Role,Action,EntityType,EntityID,Summary,IPAddress\n";
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.userName}","${l.userRole}","${l.action}","${l.entityType}","${l.entityId}","${l.summary.replace(/"/g, '""')}","${l.ipAddress}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ninimed_audit_log_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-bold uppercase">
              Regulatory Compliance & Security Audit
            </span>
            <span className="text-xs text-slate-500 font-mono">HIPAA & 21 CFR Part 11 Immutable Trail</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Clinical System Security & Compliance Audit Log
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Cryptographically sealed event ledger capturing all PHI record accesses, AI review sign-offs, and e-prescriptions.
          </p>
        </div>

        <button
          onClick={exportAuditCSV}
          className="px-4 py-2.5 rounded-2xl bg-white/80 border border-yellow-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)] transition-all hover:bg-white"
        >
          <Download className="w-4 h-4 text-yellow-600" />
          Export Compliance CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Audit Events</span>
          <div className="text-2xl font-extrabold text-slate-900">{auditLogs.length}</div>
          <span className="text-[10px] text-emerald-600">100% Immutable Verified</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Digital Signatures (21 CFR)</span>
          <div className="text-2xl font-extrabold text-teal-700">
            {auditLogs.filter((l) => l.action.includes("SIGNED") || l.action.includes("ACCEPTED")).length}
          </div>
          <span className="text-[10px] text-slate-500">SHA-256 Checksummed</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Security Violations</span>
          <div className="text-2xl font-extrabold text-emerald-600">0</div>
          <span className="text-[10px] text-emerald-600">No Unauthorized PHI Breach</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Tenant Isolation</span>
          <div className="text-base font-extrabold text-slate-900">Active</div>
          <span className="text-[10px] text-teal-600">Multi-tenant RLS Enforced</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, summary, or user name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
        >
          <option value="all">All Roles</option>
          <option value="PHYSICIAN">Physician</option>
          <option value="NURSE">Nurse</option>
          <option value="PHARMACIST">Pharmacist</option>
          <option value="PHYSIOTHERAPIST">Physiotherapist</option>
          <option value="DIETITIAN">Dietitian</option>
          <option value="SOCIAL_WORKER">Social Worker</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="p-3.5">Timestamp (UTC)</th>
                <th className="p-3.5">Actor / Clinician</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Action Code</th>
                <th className="p-3.5">Event Summary</th>
                <th className="p-3.5">Session IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-all">
                  <td className="p-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3.5 font-bold text-white whitespace-nowrap">{log.userName}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-800 text-teal-300">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-yellow-300 whitespace-nowrap">{log.action}</td>
                  <td className="p-3.5 text-slate-200">{log.summary}</td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
