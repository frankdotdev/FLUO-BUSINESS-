import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "../lib/config";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  const t = useTheme();
  useEffect(() => {
    // Tapping a notification opens the matching page (order, booking, ticket, dashboard) from the same backend.
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const path = r.notification.request.content.data?.["path"];
      if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) void WebBrowser.openBrowserAsync(`${API_URL}${path}`);
    });
    return () => sub.remove();
  }, []);
  return (<><StatusBar style="auto" /><Stack screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerTintColor: t.ink, contentStyle: { backgroundColor: t.bg } }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="b/[slug]" options={{ title: "" }} /><Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal" }} /></Stack></>);
}
