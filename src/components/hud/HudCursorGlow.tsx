/**
 * HudCursorGlow — Layer 4: Cursor-Following Radial Glow
 * TinkerFX toggleable layer. Updates --cursor-x/y CSS custom properties
 * on mousemove and renders a full-screen radial gradient that follows.
 * Disabled on touch devices (@media hover:none).
 */
"use client";

import React, { useEffect } from "react";
import { attachCursorTracker } from "@/lib/tinkerfx-patterns";

export function HudCursorGlow() {
  useEffect(() => {
    const cleanup = attachCursorTracker();
    return cleanup;
  }, []);

  return (
    <div
      className="hud-cursor-layer"
      data-layer="cursor-glow"
      aria-hidden="true"
    />
  );
}

export default HudCursorGlow;
