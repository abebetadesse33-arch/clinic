"use client";

import React, { useRef, useState, useEffect } from "react";

export interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "magenta" | "amber" | "green";
  showCorners?: boolean;
  tiltMaxDeg?: number;
  onClick?: () => void;
}

export function GlowCard({
  children,
  className = "",
  glowColor = "cyan",
  showCorners = true,
  tiltMaxDeg = 6,
  onClick,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [bloomPos, setBloomPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current || window.innerWidth < 768) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    setBloomPos({ x: percentX, y: percentY });

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = Math.max(
      -tiltMaxDeg,
      Math.min(tiltMaxDeg, (-(y - centerY) / centerY) * tiltMaxDeg)
    );
    const rotY = Math.max(
      -tiltMaxDeg,
      Math.min(tiltMaxDeg, ((x - centerX) / centerX) * tiltMaxDeg)
    );

    setRotate({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const glowColors = {
    cyan: "rgba(0, 240, 255, 0.16)",
    magenta: "rgba(255, 0, 170, 0.16)",
    amber: "rgba(255, 176, 0, 0.16)",
    green: "rgba(0, 255, 136, 0.16)",
  };

  const borderColors = {
    cyan: "rgba(0, 240, 255, 0.25)",
    magenta: "rgba(255, 0, 170, 0.25)",
    amber: "rgba(255, 176, 0, 0.25)",
    green: "rgba(0, 255, 136, 0.25)",
  };

  return (
    <div
      style={{ perspective: "1000px" }}
      className="relative inline-block w-full"
    >
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: reducedMotion
            ? "none"
            : `rotateX(${rotate.x.toFixed(2)}deg) rotateY(${rotate.y.toFixed(2)}deg)`,
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.2s ease"
            : "transform 0.5s ease-out, box-shadow 0.5s ease",
          transformStyle: "preserve-3d",
        }}
        className={`relative overflow-hidden rounded-xl border bg-slate-950/70 backdrop-blur-xl p-5 shadow-2xl transition-all ${className}`}
      >
        {/* Optical Glass Bloom Hotspot */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${bloomPos.x}% ${bloomPos.y}%, ${glowColors[glowColor]}, transparent 70%)`,
          }}
        />

        {/* Ambient Top Rim Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />

        {/* Corner Brackets */}
        {showCorners && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2"
              style={{ borderColor: borderColors[glowColor] }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2"
              style={{ borderColor: borderColors[glowColor] }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2"
              style={{ borderColor: borderColors[glowColor] }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2"
              style={{ borderColor: borderColors[glowColor] }}
            />
          </>
        )}

        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export default GlowCard;
