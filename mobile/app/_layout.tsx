import { Stack } from "expo-router";
import { AuthProvider } from "../src/state/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerShadowVisible: false,
          headerTitleStyle: { color: "#111827" },
          contentStyle: { backgroundColor: "#eef2f8" }
        }}
      />
    </AuthProvider>
  );
}
