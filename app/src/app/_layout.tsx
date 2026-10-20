import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth";

export default function Layout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FAFAF9" },
          headerTitleStyle: { color: "#1C1917", fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#FAFAF9" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Inbox" }} />
        <Stack.Screen name="login" options={{ title: "Agent login" }} />
        <Stack.Screen name="new" options={{ title: "New ticket" }} />
        <Stack.Screen name="ticket/[id]" options={{ title: "Ticket" }} />
      </Stack>
    </AuthProvider>
  );
}
