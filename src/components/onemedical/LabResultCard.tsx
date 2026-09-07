"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FlaskConical, CheckCircle2, AlertCircle, MessageSquare, ChevronDown, ChevronUp, FileText } from "lucide-react";

export interface LabItem {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: "normal" | "abnormal" | "critical";
}

export interface LabResultCardProps {
  id: string;
  testName: string;
  date: string;
  orderedBy: string;
  doctorNote?: string;
  status: "normal" | "attention" | "pending";
  items: LabItem[];
}

export default function LabResultCard({
  id,
  testName,
  date,
  orderedBy,
  doctorNote,
  status,
  items,
}: LabResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] overflow-hidden hover:border-[#B5DACF] transition-all">
      {/* Top Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-5 cursor-pointer flex items-start justify-between gap-4 bg-white hover:bg-[#FAF8F5]/60 transition-colors"
      >
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            status === "normal"
              ? "bg-[#E8F4F0] text-[#005C4B]"
              : status === "attention"
              ? "bg-[#FEF7E6] text-[#B8801C]"
              : "bg-[#EEF3F0] text-[#687B74]"
          }`}>
            <FlaskConical className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-[#162E27]">{testName}</h4>
              {status === "normal" && (
                <span className="badge-mint text-[10px] py-0.5 px-2">All In-Range</span>
              )}
              {status === "attention" && (
                <span className="badge-terracotta text-[10px] py-0.5 px-2">Doctor Follow-up</span>
              )}
            </div>
            <div className="text-xs text-[#687B74] mt-0.5">
              Collected on {date} • Ordered by {orderedBy}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#005C4B] hidden sm:inline">
            {expanded ? "Hide Details" : "View Breakdown"}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#687B74]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#687B74]" />
          )}
        </div>
      </div>

      {/* Doctor's Note Banner */}
      {doctorNote && (
        <div className="mx-5 mb-4 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#33413C] flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-[#005C4B] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#162E27] block mb-0.5">Doctor's Note:</span>
            <p className="text-[#33413C] italic">{doctorNote}</p>
          </div>
        </div>
      )}

      {/* Expanded Breakdown */}
      {expanded && (
        <div className="border-t border-[#F2EFE9] p-5 bg-[#FAF8F5]/40 space-y-3 animate-fade-in">
          <div className="text-xs font-bold uppercase tracking-wider text-[#687B74] mb-2">
            Detailed Analyte Biomarkers
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-xl border border-[#E7E2D8] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#162E27]">{item.name}</span>
                  <div className="text-[11px] text-[#687B74]">
                    Reference: {item.referenceRange}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-[#162E27]">
                    {item.value} <span className="text-[11px] font-normal text-[#687B74]">{item.unit}</span>
                  </span>
                  {item.status === "normal" ? (
                    <CheckCircle2 className="w-4 h-4 text-[#005C4B]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#D96B43]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center justify-between text-xs">
            <Link
              href={`/patient/messages?recipient=${orderedBy}`}
              className="text-[#005C4B] font-semibold hover:underline flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask {orderedBy} a question about these results</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
