import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // One Medical Brand Palette
        brand: {
          dark: "#0B3B32",      // Deep clinical forest green
          primary: "#005C4B",   // Signature actionable green
          hover: "#08493B",     // Deep hover green
          medium: "#0D7460",    // Medium forest tone
          light: "#E8F4F0",     // Soft mint tint for pills & highlights
          muted: "#F0F7F4",     // Ultra light background mint
        },

        // Warm Canvas & Surface System
        canvas: {
          cream: "#FAF8F5",     // Signature warm organic ivory background
          subtle: "#F2EFE9",    // Warm border and subtle card fill
          white: "#FFFFFF",     // Crisp card surface
          dark: "#090F0D",      // Deep night mode canvas
        },

        // Human-Centered Healthcare Accents
        accent: {
          terracotta: "#D96B43", // Warm coral/terracotta for alerts & badges
          terracottaLight: "#FBECE7",
          gold: "#E5A93C",       // Membership & ratings accent
          goldLight: "#FEF7E6",
          sage: "#7C9D8E",       // Soft botanical green
          sageLight: "#EEF3F0",
          sky: "#3B82F6",
          skyLight: "#EFF6FF",
        },

        // High Legibility Text System
        text: {
          heading: "#162E27",   // Deep dark spruce heading
          body: "#33413C",      // Readable soft charcoal
          muted: "#687B74",     // Secondary metadata
          subtle: "#9BAAA3",    // Placeholders and hints
        },

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        clinical: {
          navy: "#0a192f",
          dark: "#0f172a",
          card: "#1e293b",
          cardLight: "#ffffff",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          purple: "#8b5cf6",
          bio: "#10b981",
          psych: "#8b5cf6",
          social: "#f59e0b",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "Cambria", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        warm: "0 4px 20px -2px rgba(11, 59, 50, 0.06), 0 2px 6px -1px rgba(11, 59, 50, 0.04)",
        "warm-md": "0 10px 30px -4px rgba(11, 59, 50, 0.08), 0 4px 12px -2px rgba(11, 59, 50, 0.04)",
        "warm-lg": "0 20px 40px -6px rgba(11, 59, 50, 0.12), 0 8px 16px -4px rgba(11, 59, 50, 0.06)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
