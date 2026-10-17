import { Tabs } from "expo-router";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  return (<Tabs screenOptions={{ tabBarActiveTintColor: t.accentStrong, tabBarInactiveTintColor: t.muted, tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.border }, headerStyle: { backgroundColor: t.bg }, headerTintColor: t.ink }}>
    <Tabs.Screen name="index" options={{ title: "Explore" }} /><Tabs.Screen name="events" options={{ title: "Events" }} /><Tabs.Screen name="account" options={{ title: "Account" }} /></Tabs>);
}
