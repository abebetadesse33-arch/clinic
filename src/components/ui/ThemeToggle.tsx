"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Sparkles } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center p-0.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors">
      <button
        onClick={() => setTheme("light")}
        title="Light Mode"
        className={`p-1.5 rounded-full transition-all ${
          theme === "light"
            ? "bg-white text-amber-500 shadow-sm"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("dark")}
        title="Dark Mode"
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
