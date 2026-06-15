/**
 * SplitEase Design System
 * Centralized design tokens and styling utilities
 * All colors, typography, spacing, and shadows defined here
 */

// ═════════════════════════════════════════════════════════════════
// COLORS - SplitEase Design System
// ═════════════════════════════════════════════════════════════════

export const COLORS = {
  // Primary & Brand
  primary: "#630ed4",              // Main brand purple
  primaryContainer: "#7c3aed",     // Light purple for buttons
  onPrimaryContainer: "#ffffff",   // Text on primary container
  primaryFixed: "#ede9fe",         // Very light purple tint
  secondary: "#712edd",            // Secondary purple
  secondaryContainer: "#8b4ef7",   // Light secondary

  // Surfaces & Backgrounds
  background: "#f8f9ff",           // Page background
  surface: "#ffffff",              // Card background
  surfaceVariant: "#d5e3fc",       // Subtle surface
  surfaceContainerLow: "#f5f0ff",  // Low emphasis surface

  // Text Colors
  onSurface: "#0d1c2e",         // Primary text
  onSurfaceVariant: "#4a4455",  // Secondary text

  // Navigation & Sidebar
  sidebar: "#0f172a",           // Dark sidebar background

  // Functional Colors
  success: "#16a34a",           // Green - money owed to you
  successContainer: "#dcfce7",  // Light green background
  error: "#e11d48",             // Red - you owe
  errorContainer: "#fee2e2",    // Light red background
  warning: "#f59e0b",           // Amber
  warningContainer: "#fef3c7",  // Light amber

  // Borders & Outlines
  outline: "#cbd5e1",           // Input borders
  outlineVariant: "#ccc3d8",    // Subtle borders

  // Neutral Colors
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
} as const;

// ═════════════════════════════════════════════════════════════════
// TYPOGRAPHY - Hanken Grotesk
// ═════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",

  // Display - Large numbers, hero text
  display: {
    fontSize: "48px",
    fontWeight: 900,
    lineHeight: "56px",
    letterSpacing: "-0.02em",
  },

  // Headline Large - Page titles
  headlineLg: {
    fontSize: "32px",
    fontWeight: 900,
    lineHeight: "40px",
    letterSpacing: "-0.01em",
  },

  // Headline Medium - Section headers
  headlineMd: {
    fontSize: "24px",
    fontWeight: 800,
    lineHeight: "32px",
  },

  // Body Large - Prominent body text
  bodyLg: {
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: "28px",
  },

  // Body Medium - Default body text
  bodyMd: {
    fontSize: "16px",
    fontWeight: 500,
    lineHeight: "24px",
  },

  // Label Medium - Form labels, small text
  labelMd: {
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "20px",
  },

  // Label Small - Tiny text
  labelSm: {
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "16px",
  },
} as const;

// ═════════════════════════════════════════════════════════════════
// SPACING - 4px base unit
// ═════════════════════════════════════════════════════════════════

export const SPACING = {
  xs: "4px",    // 1x base
  sm: "8px",    // 2x base
  md: "16px",   // 4x base (internal padding)
  lg: "24px",   // 6x base (section gaps)
  xl: "48px",   // 12x base
  "2xl": "64px", // 16x base
  "3xl": "96px", // 24x base
} as const;

// ═════════════════════════════════════════════════════════════════
// BORDER RADIUS
// ═════════════════════════════════════════════════════════════════

export const BORDER_RADIUS = {
  sm: "4px",      // Small
  md: "8px",      // Medium
  lg: "12px",     // Cards & inputs
  xl: "16px",     // Large containers
  "2xl": "20px",  // Extra large
  "3xl": "24px",  // 1.5rem
  full: "9999px", // Pill buttons
} as const;

// ═════════════════════════════════════════════════════════════════
// SHADOWS - Soft Layering System
// ═════════════════════════════════════════════════════════════════

export const SHADOWS = {
  // Level 1 - Cards (subtle)
  sm: "0 1px 6px rgba(0, 0, 0, 0.06)",

  // Level 2 - Modals & elevated surfaces (medium)
  md: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",

  // Level 3 - High elevation
  lg: "0 20px 40px rgba(0, 0, 0, 0.2)",

  // Subtle
  xs: "0 1px 2px rgba(0, 0, 0, 0.05)",

  // Strong
  xl: "0 12px 24px rgba(0, 0, 0, 0.15)",
} as const;

// ═════════════════════════════════════════════════════════════════
// REUSABLE STYLE OBJECTS
// ═════════════════════════════════════════════════════════════════

export const STYLES = {
  // Page backgrounds
  pageBackground: {
    minHeight: "100vh",
    background: COLORS.background,
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: TYPOGRAPHY.fontFamily,
  },

  // Cards
  card: {
    background: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    boxShadow: SHADOWS.sm,
    padding: SPACING.md,
    border: `1px solid ${COLORS.outline}`,
  },

  cardLarge: {
    background: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    boxShadow: SHADOWS.md,
    padding: SPACING.lg,
    border: `1px solid ${COLORS.outline}`,
  },

  // Buttons - Primary (pill-shaped)
  buttonPrimary: {
    padding: "14px 24px",
    background: COLORS.primaryContainer,
    color: "#fff",
    border: "none",
    borderRadius: BORDER_RADIUS.full,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.labelMd.fontWeight,
    cursor: "pointer",
    fontFamily: TYPOGRAPHY.fontFamily,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    transition: "all 0.2s ease",
  },

  // Buttons - Secondary (outline)
  buttonSecondary: {
    padding: "12px 24px",
    background: COLORS.surface,
    color: COLORS.primaryContainer,
    border: `1px solid ${COLORS.outline}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: TYPOGRAPHY.fontFamily,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    transition: "all 0.2s ease",
  },

  // Form inputs
  input: {
    width: "100%",
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.outline}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    color: COLORS.onSurface,
    background: COLORS.background,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontWeight: 500,
    transition: "all 0.2s ease",
  },

  // Form labels
  label: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: TYPOGRAPHY.labelMd.fontWeight,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
    display: "block",
    fontFamily: TYPOGRAPHY.fontFamily,
  },

  // Text - Heading Large
  headingLg: {
    fontSize: TYPOGRAPHY.headlineLg.fontSize,
    fontWeight: TYPOGRAPHY.headlineLg.fontWeight,
    color: COLORS.onSurface,
    letterSpacing: TYPOGRAPHY.headlineLg.letterSpacing,
    fontFamily: TYPOGRAPHY.fontFamily,
  },

  // Text - Heading Medium
  headingMd: {
    fontSize: TYPOGRAPHY.headlineMd.fontSize,
    fontWeight: TYPOGRAPHY.headlineMd.fontWeight,
    color: COLORS.onSurface,
    fontFamily: TYPOGRAPHY.fontFamily,
  },

  // Text - Body
  bodyText: {
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.bodyMd.fontWeight,
    color: COLORS.onSurface,
    fontFamily: TYPOGRAPHY.fontFamily,
  },

  // Text - Secondary
  secondaryText: {
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.bodyMd.fontWeight,
    color: COLORS.onSurfaceVariant,
    fontFamily: TYPOGRAPHY.fontFamily,
  },

  // Badge - Success (green)
  badgeSuccess: {
    background: COLORS.successContainer,
    color: COLORS.success,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: TYPOGRAPHY.labelSm.fontSize,
    fontWeight: TYPOGRAPHY.labelSm.fontWeight,
    display: "inline-flex",
    alignItems: "center",
  },

  // Badge - Error (red)
  badgeError: {
    background: COLORS.errorContainer,
    color: COLORS.error,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: TYPOGRAPHY.labelSm.fontSize,
    fontWeight: TYPOGRAPHY.labelSm.fontWeight,
    display: "inline-flex",
    alignItems: "center",
  },

  // Navigation Bar
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md + " " + SPACING.lg,
    background: "rgba(255, 255, 255, 0.5)",
    borderBottom: `1px solid ${COLORS.outline}`,
  },

  // Container - Centered max-width
  container: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: `0 ${SPACING.md}`,
  },
} as const;

// ═════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════

/**
 * Merge style objects while maintaining type safety
 */
export function mergeStyles(
  ...styles: Array<Record<string, any> | undefined>
): Record<string, any> {
  return Object.assign({}, ...styles.filter(Boolean));
}

/**
 * Create a spacing value (multiplier of base 4px)
 */
export function space(multiplier: number): string {
  return `${multiplier * 4}px`;
}

/**
 * Create an rgba color with opacity
 */
export function rgba(color: string, opacity: number): string {
  // Extract hex values and convert to RGB
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Responsive style helper
 */
export const responsive = {
  mobile: "@media (max-width: 640px)",
  tablet: "@media (min-width: 641px) and (max-width: 1024px)",
  desktop: "@media (min-width: 1025px)",
} as const;

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  STYLES,
  mergeStyles,
  space,
  rgba,
  responsive,
};
