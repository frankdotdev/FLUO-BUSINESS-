import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { HomeView } from "@/components/home-view.tsx";
import { type BusinessRecord } from "@fluo/core";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  let rows: BusinessRecord[] = [];
  let favorites: BusinessRecord[] = [];

  try {
    const d = deps();
    const results = await Promise.all([
      d.store.listPublicBusinesses(24, 0).catch(() => []),
      session ? d.store.listFavoriteBusinesses(session.user.id).catch(() => []) : Promise.resolve([]),
    ]);
    rows = (results[0] ?? []) as BusinessRecord[];
    favorites = (results[1] ?? []) as BusinessRecord[];
  } catch (err) {
    console.warn("Home page database connection/data check:", err);
  }

  return (
    <HomeView
      initialBusinesses={rows}
      favoriteIds={favorites.map((b) => b.id)}
    />
  );
}
