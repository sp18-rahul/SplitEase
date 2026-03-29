import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // COLOR PALETTE
      colors: {
        // Primary Colors
        primary: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        // Accent (Purple)
        accent: {
          50: "#FAF5FF",
          100: "#F3E8FF",
          200: "#E9D5FF",
          300: "#D8B4FE",
          400: "#C084FC",
          500: "#A855F7",
          600: "#9333EA",
          700: "#7E22CE",
          800: "#6B21A8",
          900: "#581C87",
        },
        // Success (Emerald)
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#145231",
        },
        // Danger (Rose/Red)
        danger: {
          50: "#FFF5F7",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9D174D",
          900: "#831843",
        },
        // Warning (Amber)
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        // Neutral (Slate)
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },

      // TYPOGRAPHY
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        xs: ["12px", { lineHeight: "1.5", letterSpacing: "0" }],
        sm: ["14px", { lineHeight: "1.6", letterSpacing: "0" }],
        base: ["14px", { lineHeight: "1.6", letterSpacing: "0" }],
        lg: ["18px", { lineHeight: "1.4", letterSpacing: "0" }],
        xl: ["24px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "2xl": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
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

      // SPACING SCALE (8px base)
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },

      // BORDER RADIUS
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        full: "9999px",
      },

      // SHADOWS (Glassmorphism + Standard)
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 2px 4px rgba(0,0,0,0.08)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 8px 16px rgba(0,0,0,0.1)",
        xl: "0 12px 24px rgba(0,0,0,0.15)",
        "2xl": "0 20px 40px rgba(0,0,0,0.2)",
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
