"use client";

import React from "react";
import { HudPanel } from "./HudPanel";
import { StatusPill, type StatusPillVariant } from "./StatusPill";

export interface VitalsCardProps {
  title: string;
  value: string | number;
  unit: string;
  status?: StatusPillVariant;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  sparklineData?: number[];
  color?: "cyan" | "magenta" | "amber" | "green" | "red";
  className?: string;
}

export function VitalsCard({
  title,
  value,
  unit,
  status = "stable",
  trend = "stable",
  trendValue,
  sparklineData = [65, 68, 72, 70, 75, 74, 80, 78, 76, 82],
  color = "cyan",
  className = "",
}: VitalsCardProps) {
  // Generate sparkline SVG path
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 120;
  const height = 32;

  const points = sparklineData
    .map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const colorMap = {
    cyan: "#00f0ff",
    magenta: "#ff00aa",
    amber: "#ffb000",
    green: "#00ff88",
    red: "#ff2d55",
  };

  const strokeColor = colorMap[color];

  return (
    <HudPanel
      variant="refract"
      depth="md"
      className={`relative overflow-hidden p-4 ${className}`}
    >
      {/* Header: Title + Status Pill */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <StatusPill variant={status} />
      </div>

      {/* Metric Value & Unit */}
      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className="font-mono text-3xl font-bold tracking-tight"
          style={{
            color: strokeColor,
            textShadow: `0 0 12px ${strokeColor}40`,
          }}
        >
          {value}
        </span>
        <span className="font-mono text-xs text-slate-400 uppercase">
          {unit}
        </span>
      </div>

      {/* Sparkline & Trend */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80">
        <svg
          width={width}
          height={height}
          className="overflow-visible"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}
          />
        </svg>

        {trendValue && (
          <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
            {trend === "up" && <span className="text-emerald-400 font-bold">↑</span>}
            {trend === "down" && <span className="text-red-400 font-bold">↓</span>}
            {trend === "stable" && <span className="text-cyan-400 font-bold">→</span>}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </HudPanel>
  );
}

export default VitalsCard;
