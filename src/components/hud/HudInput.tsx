/**
 * HudInput — Terminal-style input
 * Transparent background, cyan expanding underline on focus,
 * monospace font, optional ">_" cursor prefix.
 */
"use client";

import React, { type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

interface HudInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showPrefix?: boolean;
  containerClassName?: string;
  error?: string;
}

export function HudInput({
  label,
  showPrefix = false,
  containerClassName,
  error,
  className,
  id,
  ...rest
}: HudInputProps) {
  const inputId = id ?? `hud-input-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className={clsx("space-y-1", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="hud-label block"
        >
          {label}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
        {showPrefix && (
          <span
            className="hud-label"
            aria-hidden="true"
            style={{ color: "var(--neon-cyan)", flexShrink: 0 }}
          >
            &gt;_
          </span>
        )}
        <input
          id={inputId}
          className={clsx("hud-input", className)}
          {...rest}
        />
      </div>
      {error && (
        <p
          className="hud-label"
          style={{ color: "var(--status-critical)", marginTop: "0.25rem" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default HudInput;
