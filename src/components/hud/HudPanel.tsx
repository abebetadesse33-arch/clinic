/**
 * HudPanel — glassfx Real-Refraction Glassmorphism Panel
 *
 * Implements the glassfx technique:
 * - SVG feDisplacementMap for genuine backdrop warping
 * - Chromatic dispersion: R/G/B displaced separately via feColorMatrix
 * - Depth: specular top edge, layered elevation shadow, masked gradient rim
 * - Bloom: cursor-tracking specular hotspot (mouse-enter/leave)
 * - Graceful fallback: backdrop-filter blur on Safari/Firefox
 * - Disabled refraction on mobile (<768px)
 * - Honors prefers-reduced-transparency and prefers-reduced-motion
 *
 * Usage:
 *   <HudPanel variant="md" bloomEnabled className="p-4">...</HudPanel>
 */
"use client";

import React, { useRef, useEffect, type ReactNode } from "react";
import { attachBloomTracker } from "@/lib/tinkerfx-patterns";
import { clsx } from "clsx";

export type HudPanelVariant = "sm" | "md" | "lg" | "strong" | "refract" | "flat";
export type HudPanelAccent = "cyan" | "amber" | "magenta" | "red" | "green" | "none";

interface HudPanelProps {
  children: ReactNode;
  variant?: HudPanelVariant;
  depth?: "sm" | "md" | "lg";
  accent?: HudPanelAccent;
  bloomEnabled?: boolean;
  refractEnabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  role?: string;
  "aria-label"?: string;
}

const ACCENT_BORDER: Record<HudPanelAccent, string> = {
  cyan:    "rgba(0, 240, 255, 0.25)",
  amber:   "rgba(255, 176, 0, 0.25)",
  magenta: "rgba(255, 0, 170, 0.25)",
  red:     "rgba(255, 45, 85, 0.25)",
  green:   "rgba(0, 255, 136, 0.25)",
  none:    "rgba(0, 240, 255, 0.15)",
};

export function HudPanel({
  children,
  variant = "md",
  depth,
  accent = "cyan",
  bloomEnabled = true,
  refractEnabled = true,
  className,
  style,
  id,
  role,
  "aria-label": ariaLabel,
}: HudPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || !bloomEnabled) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    return attachBloomTracker(el);
  }, [bloomEnabled]);

  const isRefract = variant === "refract" ? true : variant === "flat" ? false : refractEnabled;
  const sizeVariant = depth || (variant === "refract" || variant === "flat" ? "md" : variant);

  const glassClasses = clsx(
    "glass",
    `glass-${sizeVariant}`,
    bloomEnabled && "glass-bloom",
    isRefract && "glass-refract",
    className
  );

  const accentStyle: React.CSSProperties = {
    "--hud-border": `1px solid ${ACCENT_BORDER[accent]}`,
    borderColor: ACCENT_BORDER[accent],
    ...style,
  };

  return (
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={glassClasses}
      style={accentStyle}
    >
      {children}
    </div>
  );
}

export default HudPanel;
