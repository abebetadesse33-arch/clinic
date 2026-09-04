"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  FlaskConical,
  Pill,
  AlertTriangle,
  Tag,
  BookOpen,
  Copy,
  Volume2,
  VolumeX,
  Save,
  FileText,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/ai/text-to-speech";

export interface AIResponseSection {
  title: string;
  type: "list" | "steps" | "warning" | "codes" | "references";
  icon: string;
  color: string;
  content: string[];
}

export interface ClinicalAIResponse {
  headline: string;
  urgencyLevel: "routine" | "urgent" | "critical";
  confidence: number;
  sections: AIResponseSection[];
  referralLetter?: string;
  disclaimer: string;
  queryId?: string;
  provider?: string;
}

interface ClinicalAIResponseCardProps {
  response: ClinicalAIResponse;
  query: string;
  onSaveToChart?: () => void;
  isSpeaking?: boolean;
  onSpeakToggle?: () => void;
}

const SECTION_STYLES: Record<string, { border: string; badge: string; icon: React.ElementType; iconColor: string }> = {
  "Differential Diagnoses":    { border: "border-teal-500/30",   badge: "bg-teal-500/10 text-teal-300",   icon: Stethoscope,   iconColor: "text-teal-400"   },
  "Recommended Investigations": { border: "border-blue-500/30",  badge: "bg-blue-500/10 text-blue-300",   icon: FlaskConical,  iconColor: "text-blue-400"   },
  "Treatment Protocol":         { border: "border-emerald-500/30",badge: "bg-emerald-500/10 text-emerald-300", icon: Pill,       iconColor: "text-emerald-400"},
  "Drug Interactions & Contraindications": { border: "border-amber-500/40", badge: "bg-amber-500/10 text-amber-300", icon: AlertTriangle, iconColor: "text-amber-400" },
  "ICD-10 Codes":               { border: "border-purple-500/30", badge: "bg-purple-500/10 text-purple-300", icon: Tag,        iconColor: "text-purple-400" },
  "Clinical References":        { border: "border-slate-600/40",  badge: "bg-slate-700/50 text-slate-300",  icon: BookOpen,    iconColor: "text-slate-400"  },
};

function getSectionStyle(title: string) {
  return SECTION_STYLES[title] ?? {
    border: "border-indigo-500/30",
    badge: "bg-indigo-500/10 text-indigo-300",
    icon: Zap,
    iconColor: "text-indigo-400",
  };
}

export default function ClinicalAIResponseCard({
  response,
  query,
  onSaveToChart,
  isSpeaking = false,
  onSpeakToggle,
}: ClinicalAIResponseCardProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);
  const [showReferralLetter, setShowReferralLetter] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(response.sections.map((s) => s.title))
  );

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleCopy = async () => {
    const text = [
      `Clinical AI Response`,
      `Query: ${query}`,
      `Headline: ${response.headline}`,
      `Urgency: ${response.urgencyLevel.toUpperCase()}`,
      `Confidence: ${Math.round(response.confidence * 100)}%`,
      "",
      ...response.sections.map(
        (s) => `=== ${s.title} ===\n${s.content.join("\n")}`
      ),
      "",
      response.disclaimer,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2500);
  };

  const urgencyConfig = {
    routine: { label: "Routine",  classes: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400" },
    urgent:  { label: "Urgent",   classes: "bg-amber-500/10 border-amber-500/30 text-amber-400",       dot: "bg-amber-400 animate-pulse" },
    critical:{ label: "Critical", classes: "bg-rose-500/10 border-rose-500/30 text-rose-400",          dot: "bg-rose-400 animate-pulse" },
  };
  const urgency = urgencyConfig[response.urgencyLevel] ?? urgencyConfig.routine;

  return (
    <div className="bg-[#121222] border border-gray-800/80 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
      {/* Response Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${urgency.classes}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
              {urgency.label}
            </span>
            <span className="text-xs text-gray-500">
              Confidence:{" "}
              <span className="text-gray-300 font-bold">
                {Math.round(response.confidence * 100)}%
              </span>
            </span>
            {response.provider && (
              <span className="text-[10px] bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 px-2 py-0.5 rounded-md font-mono">
                {response.provider}
              </span>
            )}
          </div>
          <p className="text-sm text-white font-semibold leading-snug">{response.headline}</p>

          {/* Confidence bar */}
          <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${Math.round(response.confidence * 100)}%` }}
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy full response"
            className="p-2 rounded-lg bg-[#18182e] border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-all"
          >
            {copiedToClipboard ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onSpeakToggle}
            title={isSpeaking ? "Stop reading" : "Read aloud"}
            className={`p-2 rounded-lg border transition-all ${
              isSpeaking
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-[#18182e] border-gray-700 hover:border-indigo-500/50 text-gray-400 hover:text-indigo-300"
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {onSaveToChart && (
            <button
              onClick={onSaveToChart}
              title="Save to patient chart"
              className="p-2 rounded-lg bg-[#18182e] border border-gray-700 hover:border-emerald-500/50 text-gray-400 hover:text-emerald-300 transition-all"
            >
              <Save className="w-4 h-4" />
            </button>
          )}

          {response.referralLetter && (
            <button
              onClick={() => setShowReferralLetter((v) => !v)}
              title="Generate referral letter"
              className="p-2 rounded-lg bg-[#18182e] border border-gray-700 hover:border-blue-500/50 text-gray-400 hover:text-blue-300 transition-all"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setFeedbackGiven("up")}
            className={`p-2 rounded-lg border transition-all ${
              feedbackGiven === "up"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-[#18182e] border-gray-700 hover:border-emerald-500/50 text-gray-400 hover:text-emerald-300"
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFeedbackGiven("down")}
            className={`p-2 rounded-lg border transition-all ${
              feedbackGiven === "down"
                ? "bg-rose-600 border-rose-500 text-white"
                : "bg-[#18182e] border-gray-700 hover:border-rose-500/50 text-gray-400 hover:text-rose-300"
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Referral Letter Expand */}
      {showReferralLetter && response.referralLetter && (
        <div className="px-5 py-4 bg-[#0e0e1e] border-b border-gray-800 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Generated Referral Letter
            </span>
            <button onClick={() => setShowReferralLetter(false)} className="text-gray-500 hover:text-white text-xs">Close</button>
          </div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans bg-[#18182e] border border-gray-800 rounded-xl p-4">
            {response.referralLetter}
          </pre>
        </div>
      )}

      {/* Sections */}
      <div className="p-4 space-y-3">
        {response.sections.map((section) => {
          const style = getSectionStyle(section.title);
          const Icon = style.icon;
          const isExpanded = expandedSections.has(section.title);

          return (
            <div
              key={section.title}
              className={`rounded-xl border ${style.border} overflow-hidden`}
            >
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#18182e]/80 hover:bg-[#1e1e38] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${style.iconColor} shrink-0`} />
                  <span className="text-xs font-bold text-gray-200">
                    {section.title}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${style.badge}`}>
                    {section.content.length} {section.type === "steps" ? "steps" : "items"}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-[#0e0e1e]/60 animate-fade-in">
                  {section.type === "warning" ? (
                    <div className="space-y-2">
                      {section.content.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-200"
                        >
                          <span className="shrink-0 mt-0.5">{item.startsWith("⚠️") ? "" : "•"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : section.type === "codes" ? (
                    <div className="flex flex-wrap gap-2">
                      {section.content.map((code, i) => (
                        <span
                          key={i}
                          className="font-mono text-xs bg-purple-950/40 border border-purple-800/40 text-purple-300 px-2.5 py-1.5 rounded-lg"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : section.type === "steps" ? (
                    <ol className="space-y-2">
                      {section.content.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs text-gray-300">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">
                            {step.replace(/^Step \d+:\s*/i, "")}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : section.type === "references" ? (
                    <ul className="space-y-1.5">
                      {section.content.map((ref, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                          <BookOpen className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="italic">{ref}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-1.5">
                      {section.content.map((item, i) => (
                        <li key={i} className={`flex items-start gap-2 text-xs text-gray-300`}>
                          <span className={`shrink-0 mt-0.5 ${style.iconColor}`}>•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer Footer */}
      <div className="px-5 py-3 border-t border-gray-800/60 flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 text-gray-600 shrink-0" />
        <p className="text-[10px] text-gray-600 italic leading-tight">{response.disclaimer}</p>
      </div>
    </div>
  );
}
