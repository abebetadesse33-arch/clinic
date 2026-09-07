"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Users,
  Video,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import type { MatchedProvider } from "@/lib/services/provider-matching-service";
import ProviderMatchCard from "../registration/ProviderMatchCard";

interface ProviderMatchingProps {
  providers: MatchedProvider[];
  selectedProvider: MatchedProvider | null;
  onSelectProvider: (p: MatchedProvider) => void;
  onConfirm: () => void;
  onBack: () => void;
  isConfirming?: boolean;
}

export default function ProviderMatchingView({
  providers = [],
  selectedProvider,
  onSelectProvider,
  onConfirm,
  onBack,
  isConfirming = false,
}: ProviderMatchingProps) {
  const [showAll, setShowAll] = useState(false);

  const activeDoctor = selectedProvider || providers[0] || null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Matched On-Call Clinicians</h3>
            <p className="text-xs text-slate-400">
              Matched by clinical specialty relevance, current queue load, and 24/7 availability.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono text-teal-300">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            ✓ Specialty Matched
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            ✓ Real-time Queue Calculated
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            ✓ Instant Video / Chat Ready
          </span>
        </div>
      </div>

      {/* Recommended Doctor Highlight */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Top Recommended Clinician:
          </label>
          <span className="text-[11px] font-bold text-teal-400">
            Avg Wait: ~{activeDoctor?.estimatedWaitMinutes || 3} min
          </span>
        </div>

        {activeDoctor ? (
          <ProviderMatchCard
            provider={activeDoctor}
            isSelected={true}
            onSelect={onSelectProvider}
          />
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl bg-slate-900">
            No clinicians currently available in this specialty.
          </div>
        )}
      </div>

      {/* Alternative Clinicians Accordion */}
      {providers.length > 1 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-slate-300 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Choose a Different Doctor ({providers.length - 1} other on-call available)</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${showAll ? "rotate-180" : ""}`}
            />
          </button>

          {showAll && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fade-in">
              {providers.slice(1).map((p) => (
                <ProviderMatchCard
                  key={p.id}
                  provider={p}
                  isSelected={activeDoctor?.id === p.id}
                  onSelect={(selected) => {
                    onSelectProvider(selected);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
        >
          Back
        </button>

        <button
          type="button"
          disabled={!activeDoctor || isConfirming}
          onClick={onConfirm}
          className="flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-teal-900/40 disabled:opacity-50"
        >
          {isConfirming ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></span>
              Reserving Queue Slot & Connecting Clinician...
            </span>
          ) : (
            <>
              <span>Confirm & Enter Live Queue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
