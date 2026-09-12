/**
 * tinkerfx-patterns.ts — TinkerFX Utility Library
 * Programmatic utilities for layer-based HUD effects.
 * Self-contained, no external dependencies.
 */

// ── Layer CSS Variable Utilities ──────────────────────────────

/** Maps layer names to their CSS custom property */
export const LAYER_VAR_MAP = {
  grid: "--layer-grid-opacity",
  scanlines: "--layer-scanlines-opacity",
  vignette: "--layer-vignette-opacity",
  particles: "--layer-particles-opacity",
  "cursor-glow": "--layer-cursor-opacity",
} as const;

/** Sets a CSS custom property on the document root */
export function setCSSVar(name: string, value: string | number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(name, String(value));
}

/** Gets a CSS custom property from the document root */
export function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ── Programmatic Grid Generator ───────────────────────────────

export interface GridOptions {
  size?: number;
  color?: string;
  boldColor?: string;
  boldEvery?: number;
}

/**
 * Generates CSS background gradient strings for an animated grid.
 * Returns inline style-compatible strings.
 */
export function generateGridGradient({
  size = 48,
  color = "rgba(0, 240, 255, 0.06)",
  boldColor = "rgba(0, 240, 255, 0.18)",
  boldEvery = 5,
}: GridOptions = {}): { thin: string; bold: string } {
  const thin = [
    `linear-gradient(${color} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${color} 1px, transparent 1px)`,
  ].join(", ");

  const bold = [
    `linear-gradient(${boldColor} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${boldColor} 1px, transparent 1px)`,
  ].join(", ");

  return { thin, bold };
}

// ── Programmatic Scanlines ────────────────────────────────────

export interface ScanlineOptions {
  lineHeight?: number; // px between lines
  opacity?: number;
  color?: string;
}

/**
 * Generates a CSS background for CRT scanlines.
 */
export function generateScanlineGradient({
  lineHeight = 4,
  opacity = 0.035,
  color = "rgba(0, 0, 0, 0.4)",
}: ScanlineOptions = {}): string {
  const transparent = lineHeight / 2;
  return `repeating-linear-gradient(
    0deg,
    transparent,
    transparent ${transparent}px,
    ${color} ${transparent}px,
    ${color} ${lineHeight}px
  )`;
}

// ── Layer Style Builder ────────────────────────────────────────

export interface LayerStyleOptions {
  opacity?: number;
  blendMode?: string;
  zIndex?: number;
  pointerEvents?: string;
}

/**
 * Builds a CSSProperties object for a fixed, full-screen layer.
 */
export function buildLayerStyle({
  opacity = 1,
  blendMode = "normal",
  zIndex = 0,
  pointerEvents = "none",
}: LayerStyleOptions = {}): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    pointerEvents: pointerEvents as React.CSSProperties["pointerEvents"],
    zIndex,
    opacity,
    mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
  };
}

// ── Particle Generator ────────────────────────────────────────

export interface Particle {
  id: number;
  x: number;        // % left
  size: number;     // px
  delay: number;    // s
  duration: number; // s
  color: string;
  opacity: number;
}

const PARTICLE_COLORS = [
  "rgba(0, 240, 255, 0.8)",   // cyan
  "rgba(0, 128, 255, 0.6)",   // blue
  "rgba(0, 255, 136, 0.5)",   // green
  "rgba(255, 255, 255, 0.4)", // white
];

/**
 * Generates an array of particle definitions for CSS animation.
 */
export function generateParticles(count = 20): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 12,
    duration: Math.random() * 8 + 8,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    opacity: Math.random() * 0.4 + 0.2,
  }));
}

// ── Cursor Tracking ────────────────────────────────────────────

/**
 * Attaches a mousemove listener that sets --cursor-x and --cursor-y
 * CSS custom properties on the document root.
 * Returns a cleanup function.
 */
export function attachCursorTracker(): () => void {
  if (typeof document === "undefined") return () => {};

  const handler = (e: MouseEvent) => {
    document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
  };

  document.addEventListener("mousemove", handler, { passive: true });
  return () => document.removeEventListener("mousemove", handler);
}

// ── Boot Sequence Layer Definitions ──────────────────────────

export interface BootLayer {
  id: string;
  label: string;
  delay: number;    // ms from boot start
  color?: string;
}

/** Standard NiniMed boot sequence layers with timing */
export const BOOT_LAYERS: BootLayer[] = [
  { id: "grid",        label: "GRID MATRIX ........... INIT",    delay: 400,  color: "#00f0ff" },
  { id: "scanlines",   label: "CRT SCANLINES ......... ACTIVE",  delay: 700,  color: "#00f0ff" },
  { id: "vignette",    label: "VIGNETTE LAYER ........ ONLINE",  delay: 1000, color: "#00f0ff" },
  { id: "particles",   label: "DATA PARTICLES ........ STREAM",  delay: 1300, color: "#00ff88" },
  { id: "cursor",      label: "CURSOR INTERFACE ...... READY",   delay: 1600, color: "#00ff88" },
  { id: "ready",       label: "NINIMED HUD ........... ONLINE",  delay: 1900, color: "#00ff88" },
];

// ── glassfx Bloom Tracker ─────────────────────────────────────

/**
 * Attaches a mousemove listener on a glass element to track
 * the cursor position relative to the element bounds.
 * Updates --bloom-x and --bloom-y CSS custom properties.
 * Returns a cleanup function.
 */
export function attachBloomTracker(element: HTMLElement): () => void {
  const handler = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty("--bloom-x", `${x}%`);
    element.style.setProperty("--bloom-y", `${y}%`);
  };

  const cleanup = () => {
    element.style.removeProperty("--bloom-x");
    element.style.removeProperty("--bloom-y");
  };

  element.addEventListener("mousemove", handler, { passive: true });
  element.addEventListener("mouseleave", cleanup);

  return () => {
    element.removeEventListener("mousemove", handler);
    element.removeEventListener("mouseleave", cleanup);
  };
}

// ── HUD Ring Geometry ─────────────────────────────────────────

/**
 * Computes SVG circle arc properties for HUD ring components.
 */
export function computeRingGeometry(
  size: number,
  strokeWidth: number,
  progress: number // 0–1
): { r: number; circumference: number; dashOffset: number; cx: number; cy: number } {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return { r, circumference, dashOffset, cx: size / 2, cy: size / 2 };
}

// ── React type augmentation for CSS custom properties ─────────
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
