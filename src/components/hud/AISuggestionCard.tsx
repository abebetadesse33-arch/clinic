"use client";

import React from "react";
import { HudPanel } from "./HudPanel";
import { HudButton } from "./HudButton";
import { DataStream } from "./DataStream";

export interface AISuggestionCardProps {
  title?: string;
  confidence?: number; // 0 to 100
  streamLines: string[];
  recommendation?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AISuggestionCard({
  title = "AI CLINICAL COPILOT · DIAGNOSTIC INFERENCE",
  confidence = 94,
  streamLines,
  recommendation,
  onAccept,
  onDismiss,
  className = "",
}: AISuggestionCardProps) {
  return (
    <HudPanel
      variant="refract"
      depth="md"
      className={`relative border-magenta-500/30 p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-magenta-500/20">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-magenta-500 animate-ping" />
          <span className="font-mono text-xs uppercase tracking-widest text-magenta-400 font-bold">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-slate-400">CONFIDENCE:</span>
          <span className="text-magenta-400 font-bold">{confidence}%</span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-magenta-500 rounded-full transition-all duration-1000"
          style={{ width: `${confidence}%` }}
        />
      </div>

      {/* Terminal Typing Diagnostic Inference */}
      <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 mb-4">
        <DataStream lines={streamLines} speed={24} />
      </div>

      {/* Recommendation Highlight */}
      {recommendation && (
        <div className="mb-4 text-xs font-mono text-slate-200 bg-magenta-500/10 border-l-2 border-magenta-500 p-2.5 rounded-r">
          <strong className="text-magenta-400 uppercase tracking-wide block mb-0.5">
            Suggested Protocol:
          </strong>
          {recommendation}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-2">
        {onAccept && (
          <HudButton
            variant="primary"
            size="sm"
            onClick={onAccept}
            className="flex-1"
          >
            ACCEPT PROTOCOL
          </HudButton>
        )}
        {onDismiss && (
          <HudButton
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200"
          >
            DISMISS
          </HudButton>
        )}
      </div>
    </HudPanel>
  );
}

export default AISuggestionCard;
