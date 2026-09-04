"use client";

import React, { useState, useEffect } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Shield, Lock, Clock, User, FileText } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  PRESCRIPTION_SIGNED: "text-blue-400",
  ROLE_SWITCH: "text-violet-400",
  AI_ANALYSIS: "text-emerald-400",
  MEDICATION_ADMINISTERED: "text-indigo-400",
  LAB_RESULT_VIEWED: "text-cyan-400",
  PATIENT_RECORD_ACCESSED: "text-white/60",
  CARE_PLAN_UPDATED: "text-amber-400",
  REFERRAL_CREATED: "text-teal-400",
  AUDIT_VIEWED: "text-red-400",
  LOGIN: "text-white/50",
  LOGOUT: "text-white/30",
};

export default function AuditStreamWidget({ title }: WidgetProps) {
  const { auditLogs } = useClinic();
  const [filter, setFilter] = useState("");
  const [tick, setTick] = useState(0);

  // Simulate live stream with a gentle tick
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = auditLogs
    .filter(
      (log) =>
        !filter ||
        log.action?.toLowerCase().includes(filter.toLowerCase()) ||
        log.userRole?.toLowerCase().includes(filter.toLowerCase()) ||
        log.entityType?.toLowerCase().includes(filter.toLowerCase())
    )
    .slice(0, 50);

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          <span className="widget-title">{title}</span>
          <span className="text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/25">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{filtered.length} entries</span>
          <Lock size={12} className="text-white/30" />
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-white/8">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action, role, entity…"
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
        />
      </div>

      {/* Audit stream */}
      <div className="widget-body flex-1 overflow-y-auto">
        <div className="space-y-0 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-white/30 text-xs">
              No audit entries match filter
            </div>
          ) : (
            filtered.map((log, idx) => (
              <div key={`${log.id}-${idx}`} className="flex items-start gap-3 py-2 px-1 hover:bg-white/3 transition-colors">
                {/* Timestamp */}
                <div className="flex-shrink-0 w-16 text-[10px] text-white/25 pt-0.5">
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "--:--:--"}
                </div>

                {/* Action */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-mono font-semibold ${ACTION_COLORS[log.action] ?? "text-white/60"}`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-white/30">{log.entityType}</span>
                    {log.entityId && (
                      <span className="text-[10px] text-white/20 font-mono truncate">{log.entityId}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <User size={9} className="text-white/25" />
                    <span className="text-[10px] text-white/35">{log.userRole ?? "system"}</span>
                    {log.userId && (
                      <span className="text-[10px] text-white/20 font-mono">{log.userId}</span>
                    )}
                    {log.ipAddress && (
                      <span className="text-[10px] text-white/20">{log.ipAddress}</span>
                    )}
                    {log.digitalSignature && (
                      <div className="flex items-center gap-0.5">
                        <FileText size={8} className="text-emerald-400/50" />
                        <span className="text-[9px] text-emerald-400/50 font-mono">{log.digitalSignature.slice(0, 20)}…</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* HIPAA compliance footer */}
      <div className="px-4 py-2 border-t border-white/8 flex items-center gap-2">
        <Lock size={10} className="text-white/20" />
        <span className="text-[9px] text-white/25">
          21 CFR Part 11 · HIPAA Audit Log · Immutable · Tamper-evident · SHA-256 chained
        </span>
      </div>
    </div>
  );
}
