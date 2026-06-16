import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth, AuthProvider } from "@/context/auth";
import { ThemeProvider, useTheme } from "@/context/theme";
import { ErrorBoundary } from "@/context/error-boundary";
import { setMobileUserId } from "@/api/client";

const PURPLE = "#7C3AED";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    try {
      console.log("Setting mobile user ID:", user?.userId);
      setMobileUserId(user ? user.userId : null);
    } catch (error) {
      console.error("Error setting mobile user ID:", error);
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: PURPLE,
          headerTitleStyle: { fontWeight: "bold", color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="new-group"
          options={{ title: "New Group", presentation: "modal" }}
        />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="expenses" options={{ headerShown: false }} />
        <Stack.Screen name="activity" options={{ headerShown: false }} />
        <Stack.Screen name="friends" options={{ headerShown: false }} />
        <Stack.Screen name="[id]/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="[id]/add-expense"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="[id]/edit-expense"
          options={{ title: "Edit Expense", presentation: "modal" }}
        />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
