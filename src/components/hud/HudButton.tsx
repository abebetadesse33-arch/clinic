/**
 * HudButton — clip-path HUD button with sweep animation
 * Variants: primary (cyan), warning (amber), critical (red), ghost
 * Includes the iconic HUD corner-clip polygon shape.
 */
"use client";

import React, { type ReactNode, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

export type HudButtonVariant = "primary" | "warning" | "critical" | "ghost" | "outline";
export type HudButtonSize = "sm" | "md" | "lg";

interface HudButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: HudButtonVariant;
  size?: HudButtonSize;
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

const SIZE_CLASSES: Record<HudButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-xs px-5 py-2 gap-2",
  lg: "text-sm px-7 py-2.5 gap-2.5",
};

export function HudButton({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  icon,
  className,
  disabled,
  ...rest
}: HudButtonProps) {
  return (
    <button
      className={clsx(
        "hud-btn",
        `hud-btn-${variant}`,
        SIZE_CLASSES[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          style={{
            width: 10,
            height: 10,
            border: "1.5px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
          aria-hidden="true"
        />
      ) : (
        icon && <span className="shrink-0" aria-hidden="true">{icon}</span>
      )}
      {children}
    </button>
  );
}

export default HudButton;
