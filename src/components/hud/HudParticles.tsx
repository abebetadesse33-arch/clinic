/**
 * HudParticles — Layer 3: Floating Medical Data Dust
 * TinkerFX toggleable layer. Pure CSS animation, no tsParticles dependency.
 * 20 particles with staggered delays, colors, and sizes.
 * Disabled on mobile (<768px) and with prefers-reduced-motion.
 */
"use client";

import React, { useMemo } from "react";
import { generateParticles } from "@/lib/tinkerfx-patterns";

export function HudParticles() {
  const particles = useMemo(() => generateParticles(20), []);

  return (
    <div className="hud-particles-layer" data-layer="particles" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="hud-particle"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default HudParticles;
