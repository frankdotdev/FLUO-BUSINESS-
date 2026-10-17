import { API_URL } from "./config";
import { authClient } from "./auth";

export interface PublicBusiness { slug: string; name: string; typeId: string; countryCode: string; currency: string; acceptsAutomatic: boolean; acceptsTransfer: boolean; refundPolicy: { kind: string } }
export interface PublicProduct { imageUrl: string | null; soldOut: boolean; id: string; shortId: string; slug: string; name: string; description: string | null; price: string; fulfilment: "stock" | "made_to_order"; leadTimeHours: number }

export interface PublicEvent { name: string; venue: string | null; startsAtMs: number; timezone: string; businessName: string; businessSlug: string; path: string }

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(r.status === 404 ? "not_found" : `request_failed_${r.status}`);
  return (await r.json()) as T;
}
export const listBusinesses = () => get<{ businesses: PublicBusiness[] }>("/api/v1/businesses?limit=50").then((r) => r.businesses);
export const getBusiness = (slug: string) => get<{ business: PublicBusiness; products: PublicProduct[] }>(`/api/v1/businesses/${encodeURIComponent(slug)}`);

export async function registerPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  const cookie = authClient.getCookie();
  const r = await fetch(`${API_URL}/api/v1/push`, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, credentials: "omit", body: JSON.stringify({ token, platform }) });
  if (!r.ok) throw new Error(`push_registration_failed_${r.status}`);
}
export const listEvents = () => get<{ events: PublicEvent[] }>("/api/v1/events").then((r) => r.events);
export interface SearchResults { query: string; businesses: PublicBusiness[]; products: (PublicProduct & { businessName: string; businessSlug: string; path: string })[]; events: { name: string; startsAtMs: number; timezone: string; businessName: string; path: string }[] }
export const search = (q: string) => get<SearchResults>(`/api/v1/search?q=${encodeURIComponent(q)}`);
