import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { listEvents, type PublicEvent } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { CONTROL, RADIUS, useTheme } from "../../lib/theme";

const when = (e: PublicEvent): string => new Intl.DateTimeFormat("en-GB", { timeZone: e.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(e.startsAtMs));

export default function Events() {
  const t = useTheme();
  const [rows, setRows] = useState<PublicEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { setError(false); setRows(await listEvents()); } catch { setError(true); } }, []);
  useEffect(() => { void load(); }, [load]);

  if (error && !rows) return (<Pressable accessibilityRole="button" onPress={load} style={{ margin: 24, minHeight: CONTROL, borderRadius: 8, backgroundColor: t.ink, alignItems: "center", justifyContent: "center" }}><Text style={{ color: t.bg, fontWeight: "700" }}>Couldn't load events. Try again</Text></Pressable>);
  if (!rows) return <ActivityIndicator style={{ marginTop: 48 }} color={t.accentStrong} />;
  return (
    <FlatList data={rows} keyExtractor={(e) => e.path} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListEmptyComponent={<Text style={{ color: t.muted }}>No upcoming events yet.</Text>}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${when(item)}. Get tickets`} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}${item.path}`)} style={{ borderWidth: 1, borderColor: t.border, borderRadius: RADIUS, padding: 16, gap: 4 }}>
          <Text style={{ color: t.ink, fontSize: 18, fontWeight: "700" }}>{item.name}</Text>
          <Text style={{ color: t.muted }}>{when(item)}{item.venue ? `, ${item.venue}` : ""}</Text>
          <Text style={{ color: t.accentStrong, fontWeight: "600" }}>{item.businessName}</Text>
        </Pressable>)} />
  );
}
