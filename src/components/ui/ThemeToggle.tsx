"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme, Theme } from "@/context/ThemeContext";
import { Check, Sun, ChevronDown } from "lucide-react";

interface ThemeOption {
  id: Theme;
  label: string;
  surface: string;   // dark bg color for swatch
  accent: string;    // accent dot color
  ring: string;      // ring color when active
  isLight?: boolean;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    surface: "#f0f9ff",
    accent: "#0284c7",
    ring: "#0284c7",
    isLight: true,
  },
  {
    id: "dark",
    label: "Dark",
    surface: "#0a1b2a",
    accent: "#38bdf8",
    ring: "#38bdf8",
  },
  {
    id: "dark-emerald",
    label: "Emerald",
    surface: "#081f16",
    accent: "#10b981",
    ring: "#10b981",
  },
  {
    id: "dark-violet",
    label: "Violet",
    surface: "#130a25",
    accent: "#8b5cf6",
    ring: "#8b5cf6",
  },
  {
    id: "dark-amber",
    label: "Amber",
    surface: "#1e1503",
    accent: "#f59e0b",
    ring: "#f59e0b",
  },
  {
    id: "dark-midnight",
    label: "Midnight",
    surface: "#030a1f",
    accent: "#3b82f6",
    ring: "#3b82f6",
  },
  {
    id: "contrast",
    label: "Contrast",
    surface: "#000000",
    accent: "#facc15",
    ring: "#facc15",
  },
];

function getCurrentOption(theme: Theme): ThemeOption {
  return THEME_OPTIONS.find((o) => o.id === theme) || THEME_OPTIONS[0];
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = getCurrentOption(theme);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Theme: ${current.label}`}
        aria-label="Change theme"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: current.isLight ? "#f0f9ff" : current.surface,
          borderColor: current.accent + "55",
          boxShadow: open ? `0 0 0 2px ${current.accent}44` : undefined,
        }}
      >
        {/* Swatch dot */}
        <span
          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
          style={{ background: current.accent, boxShadow: `0 0 6px ${current.accent}88` }}
        />
        {current.isLight ? (
          <Sun className="w-3 h-3" style={{ color: current.accent }} />
        ) : (
          <span className="w-3 h-3 text-[10px] leading-none" style={{ color: current.accent }}>●</span>
        )}
        <ChevronDown
          className="w-3 h-3 transition-transform duration-200"
          style={{ color: current.accent, transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {/* Palette picker panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-50 p-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: "rgba(8, 20, 34, 0.97)",
            borderColor: "rgba(56, 109, 143, 0.35)",
            minWidth: "200px",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 px-1">
            Choose Theme
          </p>
          <div className="grid grid-cols-4 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const isActive = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setTheme(opt.id); setOpen(false); }}
                  title={opt.label}
                  className="group flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all duration-150 hover:scale-105 active:scale-95"
                  style={{
                    background: isActive ? opt.accent + "22" : "transparent",
                    outline: isActive ? `2px solid ${opt.accent}` : "2px solid transparent",
                    outlineOffset: "1px",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full relative flex items-center justify-center border-2 transition-all duration-150"
                    style={{
                      background: opt.isLight
                        ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)"
                        : `linear-gradient(135deg, ${opt.surface} 0%, ${opt.surface}cc 100%)`,
                      borderColor: isActive ? opt.accent : opt.accent + "44",
                      boxShadow: isActive ? `0 0 10px ${opt.accent}55` : undefined,
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: opt.accent, boxShadow: `0 0 6px ${opt.accent}` }}
                    />
                    {isActive && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: opt.accent }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[9px] font-semibold leading-none transition-colors"
                    style={{ color: isActive ? opt.accent : "#94a3b8" }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            className="mt-2.5 pt-2 border-t flex items-center gap-1.5 px-1"
            style={{ borderColor: "rgba(56, 109, 143, 0.25)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: current.accent, boxShadow: `0 0 5px ${current.accent}` }}
            />
            <span className="text-[10px] text-slate-400">
              Active: <span className="font-semibold" style={{ color: current.accent }}>{current.label}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
