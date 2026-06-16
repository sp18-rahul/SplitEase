import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { users } from "@/api/client";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemePreference;
  isDark: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    purple: string;
    purpleLight: string;
    success: string;
    danger: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [isDark, setIsDark] = useState(false);
  const systemColorScheme = useColorScheme();

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await users.getProfile();
        const savedTheme = res.data.theme || "system";
        setThemeState(savedTheme);
      } catch {
        // Fallback to system
        setThemeState("system");
      }
    };
    loadTheme();
  }, []);

  // Update isDark based on theme and system preference
  useEffect(() => {
    let shouldBeDark = false;

    if (theme === "dark") {
      shouldBeDark = true;
    } else if (theme === "light") {
      shouldBeDark = false;
    } else {
      // "system" - use device preference
      shouldBeDark = systemColorScheme === "dark";
    }

    setIsDark(shouldBeDark);
  }, [theme, systemColorScheme]);

  const setTheme = async (newTheme: ThemePreference) => {
    try {
      await users.updateTheme(newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  const colors = {
    // Light/Dark backgrounds
    background: isDark ? "#0f172a" : "#F8F5FF",
    surface: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f8f9ff" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    // Brand colors
    purple: "#7C3AED",
    purpleLight: "#EDE9FE",
    // Semantic colors
    success: isDark ? "#86efac" : "#22c55e",
    danger: isDark ? "#fca5a5" : "#e11d48",
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
