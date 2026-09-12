/**
 * HudVignette — Layer 2: Dark Vignette
 * TinkerFX toggleable layer. Radial gradient darkens viewport edges.
 * Creates the cinematic film-look framing.
 *
 * Self-contained snippet:
 *   <div class="hud-vignette-layer" data-layer="vignette"></div>
 */
"use client";

import React from "react";

export function HudVignette() {
  return <div className="hud-vignette-layer" data-layer="vignette" aria-hidden="true" />;
}

export default HudVignette;
