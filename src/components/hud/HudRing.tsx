"use client";

import React from "react";

export type HudRingVariant = "radar" | "progress" | "orbital" | "ecg";
export type HudRingSize = "sm" | "md" | "lg" | "xl";

export interface HudRingProps {
  variant?: HudRingVariant;
  size?: HudRingSize;
  progress?: number; // 0 to 100 for progress variant
  color?: "cyan" | "magenta" | "amber" | "green" | "red";
  label?: string;
  sublabel?: string;
  className?: string;
  children?: React.ReactNode;
}

const SIZE_MAP: Record<HudRingSize, number> = {
  sm: 44,
  md: 88,
  lg: 140,
  xl: 220,
};

const COLOR_MAP = {
  cyan: {
    stroke: "var(--neon-cyan, #00f0ff)",
    glow: "var(--glow-cyan-sm, 0 0 8px #00f0ff)",
    bg: "rgba(0, 240, 255, 0.08)",
  },
  magenta: {
    stroke: "var(--neon-magenta, #ff00aa)",
    glow: "0 0 8px #ff00aa",
    bg: "rgba(255, 0, 170, 0.08)",
  },
  amber: {
    stroke: "var(--neon-amber, #ffb000)",
    glow: "0 0 8px #ffb000",
    bg: "rgba(255, 176, 0, 0.08)",
  },
  green: {
    stroke: "var(--neon-green, #00ff88)",
    glow: "0 0 8px #00ff88",
    bg: "rgba(0, 255, 136, 0.08)",
  },
  red: {
    stroke: "var(--neon-red, #ff2d55)",
    glow: "var(--glow-red-md, 0 0 16px #ff2d55)",
    bg: "rgba(255, 45, 85, 0.08)",
  },
};

export function HudRing({
  variant = "orbital",
  size = "md",
  progress = 75,
  color = "cyan",
  label,
  sublabel,
  className = "",
  children,
}: HudRingProps) {
  const px = SIZE_MAP[size];
  const radius = px / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const theme = COLOR_MAP[color];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {/* Outer subtle guide */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
        />

        {variant === "radar" && (
          <>
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="1"
              strokeDasharray="4 8"
              className="animate-spin"
              style={{ animationDuration: "8s" }}
            />
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius * 0.6}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="0.8"
              opacity="0.5"
            />
            {/* Sweep line */}
            <line
              x1={px / 2}
              y1={px / 2}
              x2={px / 2 + radius}
              y2={px / 2}
              stroke={theme.stroke}
              strokeWidth="1.5"
              className="animate-spin origin-center"
              style={{
                transformOrigin: `${px / 2}px ${px / 2}px`,
                animationDuration: "3s",
                filter: `drop-shadow(${theme.glow})`,
              }}
            />
          </>
        )}

        {variant === "progress" && (
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke={theme.stroke}
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${px / 2} ${px / 2})`}
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(${theme.glow})`,
            }}
          />
        )}

        {variant === "orbital" && (
          <>
            {/* Clockwise ring */}
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="1.5"
              strokeDasharray={`${radius * 0.8} ${radius * 0.4}`}
              className="animate-spin origin-center"
              style={{
                transformOrigin: `${px / 2}px ${px / 2}px`,
                animationDuration: "14s",
                filter: `drop-shadow(${theme.glow})`,
              }}
            />
            {/* Counter-clockwise inner ring */}
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius * 0.72}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="1"
              strokeDasharray="3 6"
              className="origin-center"
              style={{
                transformOrigin: `${px / 2}px ${px / 2}px`,
                animation: "ringSpinRev 10s linear infinite",
                opacity: 0.6,
              }}
            />
          </>
        )}

        {variant === "ecg" && (
          <>
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="1"
              opacity="0.3"
            />
            {/* ECG pulse waveform */}
            <path
              d={`M ${px * 0.2} ${px / 2} L ${px * 0.4} ${px / 2} L ${px * 0.46} ${px * 0.3} L ${px * 0.54} ${px * 0.7} L ${px * 0.6} ${px / 2} L ${px * 0.8} ${px / 2}`}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(${theme.glow})` }}
            />
          </>
        )}
      </svg>

      {/* Center content or labels */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none">
        {children ? (
          children
        ) : (
          <>
            {label && (
              <span
                className="font-mono font-bold leading-none"
                style={{
                  fontSize: size === "sm" ? "0.625rem" : size === "md" ? "0.875rem" : "1.25rem",
                  color: theme.stroke,
                }}
              >
                {label}
              </span>
            )}
            {sublabel && (
              <span
                className="font-mono uppercase text-[0.625rem] text-slate-400 mt-0.5 tracking-wider"
              >
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HudRing;
