/**
 * HudScanlines — Layer 1: CRT Scanlines
 * TinkerFX toggleable layer. Ultra-thin repeating lines, multiply blend.
 * Active in dark mode. Disabled with prefers-reduced-transparency.
 *
 * Self-contained snippet:
 *   <div class="hud-scanlines-layer" data-layer="scanlines"></div>
 */
"use client";

import React from "react";

export function HudScanlines() {
  return <div className="hud-scanlines-layer" data-layer="scanlines" aria-hidden="true" />;
}

export default HudScanlines;
