import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { getBusiness, type PublicBusiness, type PublicProduct } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { CONTROL, RADIUS, useTheme } from "../../lib/theme";

export default function BusinessScreen() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<{ business: PublicBusiness; products: PublicProduct[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (slug) getBusiness(slug).then(setData).catch((e: Error) => setError(e.message === "not_found" ? "This business isn't available." : "We couldn't load this business.")); }, [slug]);

  if (error) return <Text style={{ color: t.ink, padding: 24, fontSize: 16 }}>{error}</Text>;
  if (!data) return <ActivityIndicator style={{ marginTop: 48 }} color={t.accentStrong} />;
  // Checkout opens the web flow in an in-app browser: it shares the exact same rules, payments and security as the website.
  const open = (p: PublicProduct) => WebBrowser.openBrowserAsync(`${API_URL}/p/${p.slug}-${p.shortId}`);
  return (
    <>
      <Stack.Screen options={{ title: data.business.name }} />
      <FlatList data={data.products} keyExtractor={(p) => p.id} contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={<Text style={{ color: t.ink, fontSize: 28, fontWeight: "800" }}>{data.business.name}</Text>}
        ListEmptyComponent={<Text style={{ color: t.muted }}>Nothing listed yet.</Text>}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.price}. Order`} onPress={() => open(item)} style={{ borderWidth: 1, borderColor: t.border, borderRadius: RADIUS, padding: 16, gap: 6 }}>
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} accessibilityLabel={item.name} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: t.surface }} resizeMode="cover" />}
            <Text style={{ color: t.ink, fontSize: 17, fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ color: t.ink, fontSize: 16 }}>{item.price}</Text>
            {item.fulfilment === "made_to_order" && <Text style={{ color: t.muted }}>Made to order, {item.leadTimeHours}h notice</Text>}
            {item.soldOut && <Text style={{ color: t.error, fontWeight: "700" }}>Sold out</Text>}
            <View style={{ minHeight: CONTROL, borderRadius: 8, backgroundColor: t.accent, alignItems: "center", justifyContent: "center", marginTop: 6 }}><Text style={{ color: "#0B0B0B", fontWeight: "700" }}>Order</Text></View>
          </Pressable>)} />
    </>
  );
}
