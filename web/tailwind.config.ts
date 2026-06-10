import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // COLOR PALETTE - SplitEase Design System
      colors: {
        // Primary Colors (SplitEase Purple)
        primary: {
          50: "#ede0ff",
          100: "#dcc3ff",
          200: "#c9a3ff",
          300: "#b382ff",
          400: "#9d62ff",
          500: "#8b4ef7",  // secondary-container
          600: "#7c3aed",  // primary-container
          700: "#712edd",  // secondary
          800: "#630ed4",  // primary
          900: "#4a0080",
        },
        // Accent (Vivid Violet)
        accent: {
          50: "#ede0ff",
          100: "#dcc3ff",
          200: "#c9a3ff",
          300: "#b382ff",
          400: "#9d62ff",
          500: "#8b4ef7",
          600: "#7c3aed",
          700: "#712edd",
          800: "#630ed4",
          900: "#4a0080",
        },
        // Success (Owed to you - Green)
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#145231",
        },
        // Danger (You owe - Red)
        danger: {
          50: "#fee2e2",
          100: "#fecdd3",
          200: "#fca5a5",
          300: "#f87171",
          400: "#f43f5e",
          500: "#e11d48",
          600: "#be123c",
          700: "#991b1b",
          800: "#7f1d1d",
          900: "#5f0f0f",
        },
        // Warning (Amber)
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Surface & Background (SplitEase)
        surface: {
          50: "#ffffff",  // surface-container-lowest
          100: "#eff4ff", // surface-container-low
          200: "#e6eeff", // surface-container
          300: "#dce9ff", // surface-container-high
          400: "#d5e3fc", // surface-container-highest
          500: "#f8f9ff", // background/surface
          600: "#f1f5f9", // neutral
          700: "#cbd5e1", // outline
          800: "#0d1c2e", // on-surface
          900: "#0f172a", // dark sidebar
        },
        // Neutral (Slate)
        neutral: {
          50: "#f8f9ff",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },

      // TYPOGRAPHY - SplitEase (Hanken Grotesk)
      fontFamily: {
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        "2xs": ["12px", { lineHeight: "1.6", letterSpacing: "0.06em", fontWeight: "600" }],  // label-sm
        xs: ["14px", { lineHeight: "2.0", letterSpacing: "0.07em", fontWeight: "700" }],    // label-md
        sm: ["16px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "500" }],         // body-md
        base: ["16px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "500" }],       // body-md
        lg: ["18px", { lineHeight: "1.56", letterSpacing: "0", fontWeight: "600" }],        // body-lg
        xl: ["24px", { lineHeight: "1.33", letterSpacing: "-0.01em", fontWeight: "800" }], // headline-md
        "2xl": ["32px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "900" }], // headline-lg
        "3xl": ["48px", { lineHeight: "1.17", letterSpacing: "-0.02em", fontWeight: "900" }], // display
      },

      fontWeight: {
        thin: "100",
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },

      // SPACING SCALE - SplitEase (4px base)
      spacing: {
        xs: "4px",   // 1x base
        sm: "8px",   // 2x base
        md: "16px",  // 4x base (internal padding)
        lg: "24px",  // 6x base (section gaps)
        xl: "48px",  // 12x base
        "2xl": "64px", // 16x base
        "3xl": "96px", // 24x base
      },

      // BORDER RADIUS - SplitEase
      borderRadius: {
        sm: "4px",      // small
        md: "8px",      // medium
        lg: "12px",     // cards & inputs (0.75rem)
        xl: "16px",     // large containers & modals (1rem)
        "2xl": "20px",  // extra large
        "3xl": "24px",  // 1.5rem
        full: "9999px", // pill buttons
      },

      // SHADOWS - SplitEase Soft Layering
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",                                  // subtle
        sm: "0 1px 6px rgba(0,0,0,0.06)",                                  // Level 1 - Cards (soft)
        md: "0 4px 6px rgba(0,0,0,0.1)",                                   // standard
        lg: "0 10px 25px -5px rgba(0,0,0,0.1)",                            // Level 2 - Modals (medium)
        xl: "0 12px 24px rgba(0,0,0,0.15)",                                // elevated
        "2xl": "0 20px 40px rgba(0,0,0,0.2)",                              // high elevation
        glass: "0 8px 32px rgba(31, 38, 135, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(15, 23, 42, 0.08)",
        "glass-lg": "0 20px 48px rgba(31, 38, 135, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(15, 23, 42, 0.1)",
        inner: "inset 0 2px 4px rgba(0,0,0,0.06)",
      },

      // ANIMATION & TRANSITIONS
      transitionDuration: {
        fast: "150ms",
        base: "300ms",
        slow: "500ms",
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // BACKDROP FILTERS
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
    },
  },
  plugins: [],
};
export default config;
