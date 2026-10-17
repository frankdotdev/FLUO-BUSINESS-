import { randomBytes } from "node:crypto";

// Canonical URL scheme. Resources are addressed by a short immutable id at the end of the path, so renaming
// a product never breaks old links: we resolve by id and redirect when the slug part is stale.
//   /b/{businessSlug}            business storefront (slug globally unique; renames keep a redirect history)
//   /p/{slug}-{shortId}          product        /s/{slug}-{shortId}   service
//   /e/{slug}-{shortId}          event          /r/{slug}-{shortId}   resource (room, venue, vehicle...)
export type ResourceType = "p" | "s" | "e" | "r";

const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";
export const SHORT_ID_LENGTH = 8;

export function newShortId(): string {
  const bytes = randomBytes(SHORT_ID_LENGTH);
  let out = "";
  for (const b of bytes) out += CROCKFORD[b % 32];
  return out;
}
const SHORT_ID_RE = new RegExp(`^[${CROCKFORD}]{${SHORT_ID_LENGTH}}$`);

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin", "api", "app", "auth", "b", "p", "s", "e", "r", "login", "logout", "signup", "signin", "register",
  "explore", "search", "settings", "account", "orders", "inbox", "cart", "checkout", "pay", "help", "support",
  "about", "terms", "privacy", "fluo", "www", "static", "assets", "_next", "dashboard", "workspace", "events",
  "tickets", "business", "businesses", "new", "status", "webhooks", "robots.txt", "sitemap.xml",
]);

export function makeSlug(text: string, maxLen = 48): string {
  const s = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLen).replace(/-+$/g, "");
  return s || "item";
}

/** Business slug: global, human-readable, never a reserved word. Suffixes -2, -3 ... on collision. */
export function uniqueBusinessSlug(name: string, isTaken: (slug: string) => boolean): string {
  const base = makeSlug(name, 40);
  const ok = (s: string): boolean => !RESERVED_SLUGS.has(s) && !isTaken(s);
  if (ok(base)) return base;
  for (let i = 2; i < 10000; i++) { const c = `${base}-${i}`; if (ok(c)) return c; }
  throw new Error("could_not_allocate_slug");
}

export const resourcePath = (type: ResourceType, name: string, shortId: string): string => `/${type}/${makeSlug(name)}-${shortId}`;
export const businessPath = (slug: string): string => `/b/${slug}`;

export interface ParsedResourcePath { readonly type: ResourceType; readonly slug: string; readonly shortId: string }

/** Parses /p/red-sneakers-7k3m9q2x. The id is the last hyphen-separated segment. Returns null if malformed. */
export function parseResourcePath(path: string): ParsedResourcePath | null {
  const m = /^\/([pser])\/([a-z0-9-]+)$/.exec(path);
  if (!m) return null;
  const [, type, rest] = m;
  const i = rest!.lastIndexOf("-");
  const shortId = i === -1 ? rest! : rest!.slice(i + 1);
  const slug = i === -1 ? "" : rest!.slice(0, i);
  return SHORT_ID_RE.test(shortId) ? { type: type as ResourceType, slug, shortId } : null;
}

/** Only redirect to the canonical path when the slug part is stale; the id decides what is shown. */
export const needsRedirect = (requestedSlug: string, currentName: string): boolean => requestedSlug !== makeSlug(currentName);
