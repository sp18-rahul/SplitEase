import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemePreference;
  isDark: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  colors: {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    purple: string;
    purpleLight: string;
    success: string;
    danger: string;
  };
}

const STORAGE_KEY = "app_theme_preference";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);
  const systemColorScheme = useColorScheme();

  const isDark =
    theme === "dark"
      ? true
      : theme === "light"
      ? false
      : systemColorScheme === "dark";

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((local) => {
        if (local === "light" || local === "dark" || local === "system") {
          setThemeState(local);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setTheme = async (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newTheme);
    } catch { /* ignore */ }
  };

  const colors = {
    background: isDark ? "#0F0D14" : "#F8F5FF",
    surface:    isDark ? "#1A1625" : "#FFFFFF",
    card:       isDark ? "#221E30" : "#FFFFFF",
    text:       isDark ? "#F1EEFF" : "#1D1A24",
    textSecondary: isDark ? "#8B83A3" : "#7B7487",
    border:     isDark ? "#2E2842" : "#F0EEFF",
    purple: "#7C3AED",
    purpleLight: isDark ? "#2D1F5E" : "#EDE9FE",
    success: isDark ? "#86efac" : "#16a34a",
    danger:  isDark ? "#fca5a5" : "#e11d48",
  };

  if (!loaded) return null;

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
