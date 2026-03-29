import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuth, AuthProvider } from "@/context/auth";
import { setMobileUserId } from "@/api/client";
import { useRouter, useSegments } from "expo-router";

const INDIGO = "#4f46e5";

function AuthGate() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setMobileUserId(user ? user.userId : null);

    const inAuthGroup = segments[0] === "login";
    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: INDIGO },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: "#f1f0ff" },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="index"
          options={{
            title: "Splitwise",
            headerRight: undefined,
          }}
        />
        <Stack.Screen
          name="new-group"
          options={{ title: "New Group", presentation: "modal" }}
        />
        <Stack.Screen
          name="profile"
          options={{ title: "My Profile" }}
        />
        <Stack.Screen
          name="[id]/index"
          options={{ title: "Group" }}
        />
        <Stack.Screen
          name="[id]/add-expense"
          options={{ title: "Add Expense", presentation: "modal" }}
        />
        <Stack.Screen
          name="[id]/edit-expense"
          options={{ title: "Edit Expense", presentation: "modal" }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
