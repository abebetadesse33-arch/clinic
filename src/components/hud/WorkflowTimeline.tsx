"use client";

import React from "react";

export interface WorkflowStep {
  id: string;
  label: string;
  time?: string;
  status: "completed" | "active" | "pending";
  operator?: string;
}

export interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStepIndex?: number;
  className?: string;
}

export function WorkflowTimeline({
  steps,
  currentStepIndex = 1,
  className = "",
}: WorkflowTimelineProps) {
  return (
    <div className={`w-full overflow-x-auto py-4 select-none ${className}`}>
      <div className="flex items-center min-w-[540px] px-4">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed" || idx < currentStepIndex;
          const isActive = step.status === "active" || idx === currentStepIndex;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <div className="flex flex-col items-center relative flex-shrink-0 group">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_14px_rgba(0,240,255,0.6)]"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                      : "bg-slate-900 text-slate-500 border border-slate-700"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>

                <div className="text-center mt-2.5 max-w-[110px]">
                  <span
                    className={`block font-mono text-xs font-semibold tracking-wider uppercase truncate ${
                      isActive
                        ? "text-cyan-400"
                        : isCompleted
                        ? "text-slate-200"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.time && (
                    <span className="block font-mono text-[0.625rem] text-slate-400 mt-0.5">
                      {step.time}
                    </span>
                  )}
                  {step.operator && (
                    <span className="block font-mono text-[0.6rem] text-cyan-600 truncate mt-0.5">
                      {step.operator}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 relative -top-3">
                  <div className="absolute inset-0 bg-slate-800" />
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(0,255,136,0.5)]"
                        : isActive
                        ? "bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                        : "bg-transparent"
                    }`}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowTimeline;
