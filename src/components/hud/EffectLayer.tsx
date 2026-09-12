/**
 * EffectLayer — TinkerFX Layer Wrapper
 * Every HUD effect must be wrapped in this component.
 * Provides data-layer attribute for DevTools inspection and X-Ray toggling.
 *
 * Usage:
 *   <EffectLayer name="grid" enabled={true}>
 *     <HudGridLayer />
 *   </EffectLayer>
 */
"use client";

import React, { type ReactNode } from "react";
import { useLayerContext, type LayerName } from "@/context/LayerContext";

interface EffectLayerProps {
  name: LayerName;
  /** Override enabled state (ignores context). Useful for server components. */
  enabled?: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function EffectLayer({
  name,
  enabled,
  children,
  className,
  style,
}: EffectLayerProps) {
  const { isEnabled } = useLayerContext();

  // Use prop override if provided, otherwise use context
  const isVisible = enabled !== undefined ? enabled : isEnabled(name);

  if (!isVisible) return null;

  return (
    <div
      data-layer={name}
      data-layer-active="true"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export default EffectLayer;
