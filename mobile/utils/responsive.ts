import { Dimensions, PixelRatio, Platform } from "react-native";
import { useWindowDimensions } from "react-native";

// Base design was made at 375px wide (iPhone SE / standard)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ─── Static helpers (usable outside components) ──────────────────────────────

/** Scale a px value proportionally to the current screen width */
export function s(size: number): number {
  const { width } = Dimensions.get("window");
  const ratio = width / BASE_WIDTH;
  // Clamp so things don't get too large on tablets or too tiny on small phones
  const clamped = Math.min(ratio, 1.4);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

/** Scale a font size — slightly less aggressive than layout scaling */
export function fs(size: number): number {
  const { width } = Dimensions.get("window");
  const ratio = width / BASE_WIDTH;
  const clamped = Math.min(ratio, 1.3);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

/** Is the current device a tablet (width >= 600)? */
export function isTablet(): boolean {
  const { width } = Dimensions.get("window");
  return width >= 600;
}

/** Is the current device a large tablet / iPad Pro (width >= 900)? */
export function isLargeTablet(): boolean {
  const { width } = Dimensions.get("window");
  return width >= 900;
}

/** Number of columns to use in a grid, based on screen width */
export function gridColumns(itemMinWidth: number): number {
  const { width } = Dimensions.get("window");
  return Math.max(1, Math.floor(width / itemMinWidth));
}

// ─── Reactive hook (use inside components for orientation awareness) ──────────

export interface ResponsiveValues {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  /** Scale a layout px value */
  s: (size: number) => number;
  /** Scale a font size */
  fs: (size: number) => number;
  /** Horizontal padding that grows on wider screens */
  hPad: number;
  /** Max content width (for centering on tablets) */
  contentWidth: number;
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const tablet = width >= 600;
  const largeTablet = width >= 900;
  const ratio = Math.min(width / BASE_WIDTH, 1.4);
  const fontRatio = Math.min(width / BASE_WIDTH, 1.3);

  const scale = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel(size * ratio));
  const fontSize = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel(size * fontRatio));

  // On tablet, add side padding so content is centered and not stretched
  const hPad = tablet ? Math.round((width - Math.min(width, 680)) / 2) : 0;
  const contentWidth = Math.min(width, tablet ? 680 : width);

  return {
    width,
    height,
    isTablet: tablet,
    isLargeTablet: largeTablet,
    isLandscape,
    s: scale,
    fs: fontSize,
    hPad,
    contentWidth,
  };
}
