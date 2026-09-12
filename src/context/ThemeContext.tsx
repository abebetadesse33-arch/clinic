"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme =
  | "light"
  | "dark"
  | "dark-emerald"
  | "dark-violet"
  | "dark-amber"
  | "dark-midnight"
  | "contrast";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
});

const DARK_THEMES: Theme[] = ["dark", "dark-emerald", "dark-violet", "dark-amber", "dark-midnight", "contrast"];

function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "contrast-mode", "hud-mode");
  root.removeAttribute("data-theme");

  if (t === "light") return;

  root.classList.add("dark", "hud-mode");

  if (t === "contrast") {
    root.classList.add("contrast-mode");
  } else if (t !== "dark") {
    root.setAttribute("data-theme", t);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("Nini_theme") as Theme | null;
    const validThemes: Theme[] = ["light", "dark", "dark-emerald", "dark-violet", "dark-amber", "dark-midnight", "contrast"];
    const initial: Theme = saved && validThemes.includes(saved) ? saved : "light";
    setThemeState(initial);
    applyThemeClass(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("Nini_theme", t);
    applyThemeClass(t);
  };

  const toggleTheme = () => {
    const cycle: Theme[] = ["light", "dark", "dark-emerald", "dark-violet", "dark-amber", "dark-midnight", "contrast"];
    const idx = cycle.indexOf(theme);
    setTheme(cycle[(idx + 1) % cycle.length]);
  };

  const isDark = DARK_THEMES.includes(theme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}