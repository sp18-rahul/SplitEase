// This directory is unused — routing is handled by the root app/_layout.tsx
import { Redirect } from "expo-router";
export default function TabsLayout() {
  return <Redirect href="/" />;
}
