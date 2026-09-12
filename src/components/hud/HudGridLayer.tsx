/**
 * HudGridLayer — Layer 0: Animated Perspective Grid Floor
 * TinkerFX toggleable layer. CSS-only animation, no dependencies.
 * Active in dark mode. Respects prefers-reduced-motion.
 *
 * Self-contained snippet:
 *   <div class="hud-grid-layer" data-layer="grid"></div>
 */
"use client";

import React from "react";

export function HudGridLayer() {
  return <div className="hud-grid-layer" data-layer="grid" aria-hidden="true" />;
}

export default HudGridLayer;
