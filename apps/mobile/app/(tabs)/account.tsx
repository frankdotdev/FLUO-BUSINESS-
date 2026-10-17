import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { authClient } from "../../lib/auth";
import { enablePush } from "../../lib/push";
import { API_URL } from "../../lib/config";
import { CONTROL, useTheme } from "../../lib/theme";

export default function Account() {
  const t = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [pushState, setPushState] = useState<string | null>(null);
  const button = (title: string, onPress: () => void, primary = false) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: CONTROL, borderRadius: 8, borderWidth: 1, borderColor: t.ink, backgroundColor: primary ? t.ink : t.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: primary ? t.bg : t.ink, fontWeight: "700" }}>{title}</Text></Pressable>);
  if (isPending) return null;
  if (!session) return (<View style={{ padding: 24, gap: 12 }}><Text style={{ color: t.ink, fontSize: 24, fontWeight: "800" }}>Your account</Text><Text style={{ color: t.muted }}>Sign in to keep your orders, bookings and tickets in one place.</Text>
    <Link href="/sign-in" asChild><Pressable accessibilityRole="button" style={{ minHeight: CONTROL, borderRadius: 8, backgroundColor: t.ink, alignItems: "center", justifyContent: "center" }}><Text style={{ color: t.bg, fontWeight: "700" }}>Sign in or create account</Text></Pressable></Link></View>);
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ color: t.ink, fontSize: 24, fontWeight: "800" }}>{session.user.name}</Text>
      <Text style={{ color: t.muted }}>{session.user.email}</Text>
      {button("My orders and bookings", () => WebBrowser.openBrowserAsync(`${API_URL}/account/orders`))}
      {button("Messages", () => WebBrowser.openBrowserAsync(`${API_URL}/account/messages`))}
      {button("Manage my business", () => WebBrowser.openBrowserAsync(`${API_URL}/app`))}
      {button(pushState === "enabled" ? "Notifications are on" : "Turn on notifications", async () => {
        try { const r = await enablePush(); setPushState(r); if (r === "denied") Alert.alert("Notifications are off", "You can turn them on in your phone's settings."); if (r === "unsupported") Alert.alert("Not available here", "Push notifications need a real phone."); }
        catch { Alert.alert("Couldn't turn on notifications", "Please try again."); } }, true)}
      {button("Sign out", async () => { await authClient.signOut(); })}
    </View>
  );
}
