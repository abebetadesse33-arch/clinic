/**
 * HudBootSequence — Layer 5: Medical Boot Sequence Overlay
 * Cinematic startup animation that assembles HUD layers one-by-one
 * with plain-language captions (TinkerFX "Build it up" approach).
 *
 * Behavior:
 * - Only runs ONCE per session (sessionStorage flag: "ninimed-boot-seen")
 * - Only in dark mode
 * - Auto-dismisses after 2.8s, or immediately on click/keypress
 * - Shows logo → layer lines → progress bar → fade out
 */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { BOOT_LAYERS } from "@/lib/tinkerfx-patterns";

const SESSION_KEY = "ninimed-boot-seen";

export function HudBootSequence() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback(() => {
    setExiting(true);
    const t = setTimeout(() => setVisible(false), 650);
    timeoutsRef.current.push(t);
  }, []);

  useEffect(() => {
    // Only in dark mode, only once per session
    const isDark = document.documentElement.classList.contains("dark");
    const alreadySeen = sessionStorage.getItem(SESSION_KEY);

    if (!isDark || alreadySeen) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);

    // Reveal layers sequentially
    BOOT_LAYERS.forEach((layer) => {
      const t = setTimeout(() => {
        setActiveLayers((prev) => [...prev, layer.id]);
      }, layer.delay);
      timeoutsRef.current.push(t);
    });

    // Auto-dismiss after last layer + buffer
    const lastDelay = BOOT_LAYERS[BOOT_LAYERS.length - 1].delay + 800;
    const dismissTimeout = setTimeout(dismiss, lastDelay);
    timeoutsRef.current.push(dismissTimeout);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`hud-boot-overlay${exiting ? " boot-exit" : ""}`}
      data-layer="boot-sequence"
      role="status"
      aria-label="NiniMed system initializing"
      onClick={dismiss}
      onKeyDown={(e) => (e.key === "Escape" || e.key === "Enter") && dismiss()}
      tabIndex={0}
    >
      {/* Logo */}
      <div className="hud-boot-logo" aria-hidden="true">
        NINIMED
      </div>

      {/* Ethiopian cultural accent */}
      <div
        className="eth-badge text-sm"
        style={{ letterSpacing: "0.2em", opacity: 0.7 }}
        aria-hidden="true"
      >
        ኒኒ ሜድ · AI CLINICAL PLATFORM
      </div>

      {/* Layer-by-layer build-up */}
      <div className="hud-boot-layers" role="list">
        {BOOT_LAYERS.map((layer) => (
          <div
            key={layer.id}
            className="hud-boot-layer-line"
            role="listitem"
            style={{
              opacity: activeLayers.includes(layer.id) ? 1 : 0,
              transform: activeLayers.includes(layer.id) ? "none" : "translateX(-12px)",
              transition: "opacity 400ms ease, transform 400ms ease",
              color: layer.color,
            }}
            aria-hidden="true"
          >
            <span className="boot-dot" />
            <span>{layer.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="hud-boot-progress" aria-hidden="true">
        <div className="hud-boot-progress-fill" />
      </div>

      {/* Dismiss hint */}
      <p
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.625rem",
          color: "rgba(0, 240, 255, 0.35)",
          letterSpacing: "0.1em",
          marginTop: "0.5rem",
        }}
        aria-hidden="true"
      >
        CLICK ANYWHERE TO SKIP
      </p>
    </div>
  );
}

export default HudBootSequence;
