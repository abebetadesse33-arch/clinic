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

        // Professional clinical blue palette
        brand: {
          dark: "#12304A",
          primary: "#075985",
          hover: "#0C4A6E",
          medium: "#0369A1",
          light: "#E0F2FE",
          muted: "#F0F9FF",
        },

        // Cool canvas and surface system
        canvas: {
          cream: "#F5FAFF",
          subtle: "#EAF4FB",
          white: "#FFFFFF",
          dark: "#071521",
        },

        // Human-Centered Healthcare Accents
        accent: {
          terracotta: "#C2410C",
          terracottaLight: "#FFF7ED",
          gold: "#B7791F",
          goldLight: "#FFFBEB",
          sage: "#0284C7",
          sageLight: "#E0F2FE",
          sky: "#0284C7",
          skyLight: "#E0F2FE",
        },

        // High Legibility Text System
        text: {
          heading: "#16324F",
          body: "#334E68",
          muted: "#58738A",
          subtle: "#8AA2B5",
        },

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
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
          navy: "#12304A",
          dark: "#0F2538",
          card: "#17364F",
          cardLight: "#ffffff",
          cyan: "#0891B2",
          blue: "#0284C7",
          emerald: "#38bdf8",
          amber: "#f59e0b",
          rose: "#f43f5e",
          purple: "#8b5cf6",
          bio: "#0ea5e9",
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
        warm: "0 4px 20px -2px rgba(2, 132, 199, 0.08), 0 2px 6px -1px rgba(2, 132, 199, 0.04)",
        "warm-md": "0 10px 30px -4px rgba(2, 132, 199, 0.12), 0 4px 12px -2px rgba(2, 132, 199, 0.06)",
        "warm-lg": "0 20px 40px -6px rgba(2, 132, 199, 0.16), 0 8px 16px -4px rgba(2, 132, 199, 0.08)",
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
