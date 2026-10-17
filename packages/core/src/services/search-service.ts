import { BUSINESS_TYPES } from "../platform/business-types.ts";
import { isTypeReady } from "../platform/workspace.ts";
import type { BusinessRecord, Deps, EventRecord, ProductRecord } from "./ports.ts";

export interface SearchResults {
  readonly query: string;
  readonly businesses: BusinessRecord[];
  readonly products: { product: ProductRecord; business: BusinessRecord }[];
  readonly events: { event: EventRecord; business: BusinessRecord }[];
}
const LIMIT = 20;
export const normaliseQuery = (q: string): string => q.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 60);

/** Marketplace search. Matches names and descriptions, and also business TYPES ("barber" finds salons whatever they are called). */
export async function searchMarketplace(d: Deps, raw: string): Promise<SearchResults> {
  const query = normaliseQuery(raw);
  if (query.length < 2) return { query, businesses: [], products: [], events: [] };
  const found = await d.store.searchPublic(query, LIMIT);
  const lower = query.toLowerCase();
  const typeIds = BUSINESS_TYPES.filter((t) => t.label.toLowerCase().includes(lower) || t.id.replaceAll("_", " ").includes(lower)).map((t) => t.id);
  const byType = typeIds.length > 0 ? await d.store.listPublicBusinesses(LIMIT, 0, undefined, typeIds) : [];
  const seen = new Set<string>(); const businesses: BusinessRecord[] = [];
  for (const b of [...found.businesses, ...byType]) if (!seen.has(b.id)) { seen.add(b.id); businesses.push(b); }
  return { query, businesses: businesses.slice(0, LIMIT), products: found.products, events: found.events };
}

/** Categories shown on the home page: only groups that contain at least one business type that can be opened today. */
const GROUP_LABEL: Readonly<Record<string, string>> = { food: "Food", retail: "Shops", beauty: "Beauty", hospitality: "Stays", events: "Events", wellness: "Wellness", health: "Health", everyday: "Everyday", creative: "Creative", mobility: "Cars and transport", education: "Learning", professional: "Professionals", property: "Property", home_services: "Home services", agri_b2b: "Farm and wholesale", community: "Community", general: "Other" };
export const categories = (): { group: string; label: string }[] =>
  [...new Set(BUSINESS_TYPES.filter((t) => isTypeReady(t) && t.tier !== "later").map((t) => t.group))].map((group) => ({ group, label: GROUP_LABEL[group] ?? group })).sort((a, b) => a.label.localeCompare(b.label));
export const typeIdsInGroup = (group: string): string[] => BUSINESS_TYPES.filter((t) => t.group === group && isTypeReady(t) && t.tier !== "later").map((t) => t.id);
