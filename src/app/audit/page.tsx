"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  History,
  ShieldCheck,
  Search,
  Lock,
  Download,
  Filter,
  CheckCircle2,
  FileText,
  User,
} from "lucide-react";

export default function AuditCompliancePage() {
  const { auditLogs } = useClinic();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const exportAuditCSV = () => {
    const headers = "ID,Timestamp,User,Role,Action,EntityType,EntityID,Summary,IPAddress\n";
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.userName}","${l.userRole}","${l.action}","${l.entityType}","${l.entityId}","${l.summary.replace(
            /"/g,
            '""'
          )}","${l.ipAddress}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `NiniMed_HIPAA_Audit_Trail_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Compliance & Immutable Audit Log</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            21 CFR Part 11 and HIPAA/GDPR immutable transaction log with cryptographic traceability for all CDSS actions and clinician signatures.
          </p>
        </div>

        <button
          onClick={exportAuditCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:scale-105"
        >
          <Download className="w-4 h-4 text-teal-400" />
          Export Compliance CSV
        </button>
      </div>

      {/* Trust & Guarantee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Append-Only Immutability</h4>
            <p className="text-[11px] text-slate-400">Zero updates or deletes permitted at database level.</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Cryptographic Sign-Off</h4>
            <p className="text-[11px] text-slate-400">SHA-256 tokens generated for each prescription signature.</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Full Event Lineage</h4>
            <p className="text-[11px] text-slate-400">AI recommendations linked directly to human review actions.</p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Actor, Action, Entity, Details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium">Action Filter:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All System Events ({auditLogs.length})</option>
            <option value="PRESCRIPTION_SIGNED">Prescriptions Signed</option>
            <option value="AI_ANALYSIS_TRIGGERED">AI Analysis Invocations</option>
            <option value="BIOMARKER_RULE_CURATED">Biomarker Curation</option>
            <option value="PATIENT_RECORD_VIEWED">Patient Access</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Timestamp (UTC)</th>
                <th className="p-3.5">Clinician / Actor</th>
                <th className="p-3.5">Action Code</th>
                <th className="p-3.5">Audit Summary & Details</th>
                <th className="p-3.5">IP & Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap text-[11px]">{log.timestamp}</td>
                  <td className="p-3.5 font-medium text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-400" />
                      {log.userName}
                    </div>
                    <span className="text-[10px] text-slate-400 block ml-5">{log.userRole}</span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-200 max-w-md leading-relaxed">{log.summary}</td>
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
