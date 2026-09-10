"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Sparkles, Palette, Stars } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center p-0.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors">
      <button
        onClick={() => setTheme("light")}
        title="Light Mode"
        aria-label="Light Mode"
        className={`p-1.5 rounded-full transition-all ${
          theme === "light"
            ? "bg-white text-amber-500 shadow-sm"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("lavender")}
        title="Lavender Theme"
        aria-label="Lavender Theme"
        className={`p-1.5 rounded-full transition-all ${
          theme === "lavender"
            ? "bg-violet-100 text-violet-600 shadow-sm"
            : "text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300"
        }`}
      >
        <Palette className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("midnight")}
        title="Midnight Theme"
        aria-label="Midnight Theme"
        className={`p-1.5 rounded-full transition-all ${
          theme === "midnight"
            ? "bg-indigo-950 text-cyan-300 shadow-sm"
            : "text-slate-500 hover:text-indigo-700 dark:text-slate-400 dark:hover:text-cyan-300"
        }`}
      >
        <Stars className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("dark")}
        title="Dark Mode"
        aria-label="Dark Mode"
        className={`p-1.5 rounded-full transition-all ${
          theme === "dark"
            ? "bg-sky-950 text-sky-300 shadow-sm"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("contrast")}
        title="Clinical High-Contrast Mode"
        aria-label="Clinical High-Contrast Mode"
        className={`p-1.5 rounded-full transition-all ${
          theme === "contrast"
            ? "bg-cyan-600 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
