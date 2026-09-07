"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "light" | "dark" | "contrast";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("Nini_theme") as Theme | null;
    if (saved && (saved === "light" || saved === "dark" || saved === "contrast")) {
      setThemeState(saved);
      applyThemeClass(saved);
    } else {
      const initial: Theme = "light";
      setThemeState(initial);
      applyThemeClass(initial);
    }
  }, []);

  const applyThemeClass = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "contrast-mode");
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "contrast") {
      root.classList.add("dark", "contrast-mode");
    }
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("Nini_theme", t);
    applyThemeClass(t);
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "contrast" : "light";
    setTheme(next);
  };

  const isDark = theme === "dark" || theme === "contrast";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
