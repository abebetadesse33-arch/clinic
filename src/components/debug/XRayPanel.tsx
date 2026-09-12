/**
 * XRayPanel — TinkerFX Layer Toggle Debug Panel
 * DEV-ONLY: Only rendered when process.env.NODE_ENV === 'development'.
 * Floating panel (bottom-right) with checkboxes for each HUD layer
 * and opacity sliders that highlight the exact CSS variable they modify.
 *
 * Features:
 * - Toggle each layer on/off
 * - Opacity sliders with live CSS variable feedback
 * - Layer name maps to data-layer attribute in DOM
 * - Collapsible to minimize screen real-estate
 */
"use client";

import React, { useState } from "react";
import { useLayerContext, type LayerName, type LayerOpacity } from "@/context/LayerContext";

interface LayerConfig {
  name: LayerName;
  label: string;
  hasOpacity: boolean;
  opacityMin: number;
  opacityMax: number;
  opacityStep: number;
  cssVar: string;
}

const LAYER_CONFIGS: LayerConfig[] = [
  {
    name: "grid",
    label: "Grid Matrix",
    hasOpacity: true,
    opacityMin: 0,
    opacityMax: 1,
    opacityStep: 0.05,
    cssVar: "--layer-grid-opacity",
  },
  {
    name: "scanlines",
    label: "CRT Scanlines",
    hasOpacity: true,
    opacityMin: 0,
    opacityMax: 0.15,
    opacityStep: 0.005,
    cssVar: "--layer-scanlines-opacity",
  },
  {
    name: "vignette",
    label: "Vignette",
    hasOpacity: true,
    opacityMin: 0,
    opacityMax: 1,
    opacityStep: 0.05,
    cssVar: "--layer-vignette-opacity",
  },
  {
    name: "particles",
    label: "Particles",
    hasOpacity: true,
    opacityMin: 0,
    opacityMax: 1,
    opacityStep: 0.05,
    cssVar: "--layer-particles-opacity",
  },
  {
    name: "cursor-glow",
    label: "Cursor Glow",
    hasOpacity: true,
    opacityMin: 0,
    opacityMax: 0.4,
    opacityStep: 0.01,
    cssVar: "--layer-cursor-opacity",
  },
];

export function XRayPanel() {
  const { enabled, opacity, toggleLayer, setOpacity } = useLayerContext();
  const [collapsed, setCollapsed] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="xray-panel" role="complementary" aria-label="X-Ray Debug Panel">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: collapsed ? 0 : "0.625rem",
          cursor: "pointer",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <p className="xray-panel-title" style={{ marginBottom: 0 }}>
          ◈ X-RAY MODE
        </p>
        <span
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.625rem",
            color: "rgba(0, 240, 255, 0.5)",
          }}
        >
          {collapsed ? "▲" : "▼"}
        </span>
      </div>

      {!collapsed && (
        <>
          {LAYER_CONFIGS.map((config) => (
            <div key={config.name}>
              <div className="xray-layer-row">
                <input
                  id={`xray-${config.name}`}
                  type="checkbox"
                  checked={enabled[config.name] ?? true}
                  onChange={() => toggleLayer(config.name)}
                  aria-label={`Toggle ${config.label} layer`}
                />
                <label
                  htmlFor={`xray-${config.name}`}
                  style={{ cursor: "pointer", flex: 1 }}
                >
                  {config.label}
                </label>
                {config.hasOpacity && (
                  <input
                    type="range"
                    min={config.opacityMin}
                    max={config.opacityMax}
                    step={config.opacityStep}
                    value={opacity[config.name as keyof LayerOpacity] ?? config.opacityMax / 2}
                    onChange={(e) =>
                      setOpacity(
                        config.name as keyof LayerOpacity,
                        Number(e.target.value)
                      )
                    }
                    aria-label={`${config.label} opacity`}
                    title={`CSS: ${config.cssVar}`}
                  />
                )}
              </div>
              {/* CSS var label — "Live Code Mapping" per TinkerFX methodology */}
              {config.hasOpacity && (
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "0.5625rem",
                    color: "rgba(0, 240, 255, 0.3)",
                    paddingLeft: "1.25rem",
                    marginTop: "-0.25rem",
                    marginBottom: "0.375rem",
                  }}
                  aria-hidden="true"
                >
                  {config.cssVar}
                </div>
              )}
            </div>
          ))}

          {/* Reset all */}
          <button
            onClick={() => {
              LAYER_CONFIGS.forEach((c) => {
                if (!(enabled[c.name] ?? true)) toggleLayer(c.name);
              });
            }}
            style={{
              marginTop: "0.5rem",
              width: "100%",
              padding: "0.25rem",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.625rem",
              color: "rgba(0, 240, 255, 0.6)",
              background: "rgba(0, 240, 255, 0.05)",
              border: "1px solid rgba(0, 240, 255, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            RESET ALL LAYERS
          </button>
        </>
      )}
    </div>
  );
}

export default XRayPanel;
