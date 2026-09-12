/**
 * GlassFilter — SVG Optical Refraction Filter for glassfx
 * Mounts the feDisplacementMap + feTurbulence filter once at root (layout.tsx).
 * Enables genuine chromatic optical refraction on elements using .glass-refract.
 */
import React from "react";

export function GlassFilter() {
  return (
    <svg
      className="glass-defs"
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter id="glassfx-filter" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.07"
            numOctaves={2}
            seed={12}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="glass-refract" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.07"
            numOctaves={2}
            seed={12}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default GlassFilter;
