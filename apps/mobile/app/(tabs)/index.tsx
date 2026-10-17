import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { BUSINESS_TYPES } from "@fluo/core/client";
import { listBusinesses, search, type PublicBusiness, type SearchResults } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { CONTROL, RADIUS, useTheme } from "../../lib/theme";

const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));
type Row = { key: string; title: string; subtitle: string; onPress: () => void };
const openWeb = (path: string) => WebBrowser.openBrowserAsync(`${API_URL}${path}`);

export default function Explore() {
  const t = useTheme();
  const [rows, setRows] = useState<PublicBusiness[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<SearchResults | null>(null);
  const load = useCallback(async () => { try { setError(false); setRows(await listBusinesses()); } catch { setError(true); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {                                              // search as you type, after a short pause
    const text = q.trim();
    if (text.length < 2) { setFound(null); return; }
    const id = setTimeout(() => { search(text).then(setFound).catch(() => setFound({ query: text, businesses: [], products: [], events: [] })); }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const bizRow = (b: PublicBusiness): Row => ({ key: `b-${b.slug}`, title: b.name, subtitle: label.get(b.typeId) ?? "Business", onPress: () => router.push({ pathname: "/b/[slug]", params: { slug: b.slug } }) });
  const list: Row[] = found
    ? [...found.businesses.map(bizRow),
       ...found.products.map((p) => ({ key: `p-${p.id}`, title: p.name, subtitle: `${p.price} at ${p.businessName}`, onPress: () => void openWeb(p.path) })),
       ...found.events.map((e) => ({ key: `e-${e.path}`, title: e.name, subtitle: `Event, ${e.businessName}`, onPress: () => void openWeb(e.path) }))]
    : (rows ?? []).map(bizRow);

  if (error && !rows) return (<View style={{ padding: 24, gap: 12 }}><Text style={{ color: t.ink, fontSize: 16 }}>We couldn't load businesses. Check your connection.</Text>
    <Pressable accessibilityRole="button" onPress={load} style={{ minHeight: CONTROL, borderRadius: 8, backgroundColor: t.ink, alignItems: "center", justifyContent: "center" }}><Text style={{ color: t.bg, fontWeight: "700" }}>Try again</Text></Pressable></View>);
  if (!rows) return <ActivityIndicator style={{ marginTop: 48 }} color={t.accentStrong} />;
  return (
    <FlatList data={list} keyExtractor={(r) => r.key} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={<View style={{ gap: 10 }}><Text style={{ color: t.ink, fontSize: 28, fontWeight: "800" }}>Discover. Buy. Book. Attend.</Text>
        <TextInput accessibilityLabel="Search" placeholder="Search businesses, items and events" placeholderTextColor={t.muted} value={q} onChangeText={setQ} autoCapitalize="none" returnKeyType="search" maxLength={60}
          style={{ minHeight: CONTROL, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 12, color: t.ink, fontSize: 16 }} /></View>}
      ListEmptyComponent={<Text style={{ color: t.muted }}>{found ? "Nothing found. Try a shorter word." : "No businesses are live yet."}</Text>}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.subtitle}`} onPress={item.onPress} style={{ borderWidth: 1, borderColor: t.border, borderRadius: RADIUS, padding: 16, gap: 4 }}>
          <Text style={{ color: t.ink, fontSize: 18, fontWeight: "700" }}>{item.title}</Text><Text style={{ color: t.muted }}>{item.subtitle}</Text></Pressable>)} />
  );
}
