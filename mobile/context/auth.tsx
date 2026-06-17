import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { setOnUnauthorized } from "@/api/client";

interface AuthUser {
  userId: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  updateName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start (non-blocking)
  useEffect(() => {
    // Don't block UI - set loading to false immediately
    setIsLoading(false);

    // Restore session in background
    const restoreSession = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${API_URL}/api/users/profile`, {
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          setUser({ userId: data.id, name: data.name, email: data.email });
        }
      } catch (error) {
        // Silent fail - user will see login screen
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      setUser({ userId: data.userId, name: data.name, email: data.email });
      return {};
    } catch {
      return { error: "Cannot connect to server. Check your network." };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateName = useCallback((name: string) => {
    setUser((prev) => (prev ? { ...prev, name } : null));
  }, []);

  // Register logout callback for API interceptor
  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
