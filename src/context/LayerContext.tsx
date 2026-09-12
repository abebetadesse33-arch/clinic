/**
 * LayerContext — TinkerFX Layer Visibility State
 * Controls which HUD effect layers are visible.
 * Consumed by EffectLayer and XRayPanel components.
 */
"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type LayerName =
  | "grid"
  | "scanlines"
  | "vignette"
  | "particles"
  | "cursor-glow"
  | "boot-sequence";

export interface LayerOpacity {
  grid: number;
  scanlines: number;
  vignette: number;
  particles: number;
  "cursor-glow": number;
}

interface LayerContextValue {
  enabled: Record<LayerName, boolean>;
  opacity: LayerOpacity;
  toggleLayer: (name: LayerName) => void;
  setOpacity: (name: keyof LayerOpacity, value: number) => void;
  isEnabled: (name: LayerName) => boolean;
}

const DEFAULT_ENABLED: Record<LayerName, boolean> = {
  grid: true,
  scanlines: true,
  vignette: true,
  particles: true,
  "cursor-glow": true,
  "boot-sequence": true,
};

const DEFAULT_OPACITY: LayerOpacity = {
  grid: 0.7,
  scanlines: 0.035,
  vignette: 0.55,
  particles: 0.6,
  "cursor-glow": 0.15,
};

const LayerContext = createContext<LayerContextValue | null>(null);

export function LayerProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<Record<LayerName, boolean>>(DEFAULT_ENABLED);
  const [opacity, setOpacityState] = useState<LayerOpacity>(DEFAULT_OPACITY);

  const toggleLayer = useCallback((name: LayerName) => {
    setEnabled((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const setOpacity = useCallback((name: keyof LayerOpacity, value: number) => {
    setOpacityState((prev) => ({ ...prev, [name]: value }));
    // Also update the CSS custom property for real-time feedback
    if (typeof document !== "undefined") {
      const varMap: Record<keyof LayerOpacity, string> = {
        grid: "--layer-grid-opacity",
        scanlines: "--layer-scanlines-opacity",
        vignette: "--layer-vignette-opacity",
        particles: "--layer-particles-opacity",
        "cursor-glow": "--layer-cursor-opacity",
      };
      document.documentElement.style.setProperty(varMap[name], String(value));
    }
  }, []);

  const isEnabled = useCallback(
    (name: LayerName) => enabled[name] ?? true,
    [enabled]
  );

  return (
    <LayerContext.Provider value={{ enabled, opacity, toggleLayer, setOpacity, isEnabled }}>
      {children}
    </LayerContext.Provider>
  );
}

export function useLayerContext(): LayerContextValue {
  const ctx = useContext(LayerContext);
  if (!ctx) {
    // Return default so components don't crash outside LayerProvider
    return {
      enabled: DEFAULT_ENABLED,
      opacity: DEFAULT_OPACITY,
      toggleLayer: () => {},
      setOpacity: () => {},
      isEnabled: () => true,
    };
  }
  return ctx;
}
