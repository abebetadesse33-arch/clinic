"use client";

import React from "react";
import {
  Stethoscope,
  Star,
  Clock,
  CheckCircle2,
  Users,
  Award,
  Globe,
  Building,
} from "lucide-react";
import type { MatchedProvider } from "@/lib/services/provider-matching-service";

interface ProviderMatchCardProps {
  provider: MatchedProvider;
  isSelected: boolean;
  onSelect: (provider: MatchedProvider) => void;
}

export default function ProviderMatchCard({
  provider,
  isSelected,
  onSelect,
}: ProviderMatchCardProps) {
  const initials = provider.fullName
    .replace(/^Dr\.\s*/i, "")
    .replace(/^Nurse\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      onClick={() => onSelect(provider)}
      className={`relative p-5 rounded-3xl border transition-all cursor-pointer space-y-4 ${
        isSelected
          ? "bg-slate-900 border-teal-400 ring-2 ring-teal-400/30 shadow-xl shadow-teal-950/50"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
      }`}
    >
      {/* Selection pill */}
      {isSelected && (
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Selected</span>
        </div>
      )}

      {/* Header: Photo / Initials + Name */}
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-slate-950 font-extrabold text-base flex items-center justify-center shadow-lg shadow-teal-900/30">
            {initials}
          </div>
          {provider.isOnline && (
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          )}
        </div>

        <div className="flex-1 pr-16">
          <h4 className="text-sm font-extrabold text-white leading-tight">{provider.fullName}</h4>
          <p className="text-xs text-teal-400 font-medium mt-0.5">{provider.specialty}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {provider.rating.toFixed(1)}
            </span>
            <span>•</span>
            <span>{provider.experienceYears} yrs exp</span>
          </div>
        </div>
      </div>

      {/* Hospital Affiliation & Languages */}
      <div className="text-[11px] text-slate-400 space-y-1">
        {provider.hospitalAffiliation && (
          <div className="flex items-center gap-1.5 truncate">
            <Building className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{provider.hospitalAffiliation}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-slate-500 shrink-0" />
          <span>{provider.languages.join(", ")}</span>
        </div>
      </div>

      {/* Wait Time & Queue Status Bar */}
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span>Estimated Wait:</span>
          <strong className="text-white font-mono">{provider.estimatedWaitMinutes} min</strong>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Users className="w-3 h-3 text-slate-500" />
          <span>{provider.currentQueueCount} in line</span>
        </div>
      </div>

      {/* Match Reason Tag */}
      {provider.matchReason && (
        <div className="text-[11px] font-medium text-teal-300/85 bg-teal-500/10 px-3 py-1.5 rounded-xl border border-teal-500/20">
          ✨ {provider.matchReason}
        </div>
      )}
    </div>
  );
}
