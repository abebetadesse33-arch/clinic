"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { GitMerge, AlertCircle, CheckCircle, Clock, ArrowRight, Plus } from "lucide-react";
import type { ReferralRecord } from "@/lib/types/clinical";

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  draft: { icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/25", label: "Draft" },
  pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", label: "Pending" },
  pending_review: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", label: "Pending Review" },
  approved: { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25", label: "Approved" },
  accepted: { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25", label: "Accepted" },
  scheduled: { icon: Clock, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/25", label: "Scheduled" },
  in_progress: { icon: ArrowRight, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/25", label: "In Progress" },
  completed: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", label: "Completed" },
  cancelled: { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/25", label: "Cancelled" },
  rejected: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/25", label: "Rejected" },
  no_show: { icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25", label: "No Show" },
};

const PRIORITY_COLORS: Record<string, string> = {
  routine: "bg-white/8 text-white/40",
  urgent: "bg-amber-500/20 text-amber-300",
  stat: "bg-red-500/20 text-red-300",
};

export default function CareGapsWidget({ title }: WidgetProps) {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);

  React.useEffect(() => {
    fetch("/api/v1/referrals")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setReferrals(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const updateStatus = (id: string, status: ReferralRecord["status"]) => {
    setReferrals((prev) =>
      prev.map((r) => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
    );
  };

  const openCount = referrals.filter((r) => r.status !== "completed" && r.status !== "rejected").length;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <GitMerge size={16} className="text-teal-400" />
          <span className="widget-title">{title}</span>
        </div>
        <span className={`widget-badge ${openCount > 0 ? "widget-badge-alert" : ""}`}>
          {openCount} open
        </span>
      </div>

      <div className="widget-body flex-1 overflow-y-auto space-y-2">
        {referrals.map((ref) => {
          const cfg = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <div key={ref.id} className={`p-3 rounded-lg border ${cfg.bg}`}>
              <div className="flex items-start gap-2">
                <Icon size={13} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      → {ref.receivingRole.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[ref.priority]}`}>
                      {ref.priority}
                    </span>
                    <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5 line-clamp-1">{ref.clinicalReason}</p>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {ref.patientName} · {new Date(ref.createdAt).toLocaleString()}
                  </div>

                  {/* Quick actions */}
                  {ref.status === "pending" && (
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        onClick={() => updateStatus(ref.id, "accepted")}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateStatus(ref.id, "rejected")}
                        className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/25"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {ref.status === "in_progress" && (
                    <button
                      onClick={() => updateStatus(ref.id, "completed")}
                      className="mt-1.5 text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25"
                    >
                      ✓ Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
