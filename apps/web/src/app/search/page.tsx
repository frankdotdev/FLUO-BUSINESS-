import Link from "next/link";
import { BUSINESS_TYPES, categories, fmtLocal, fmtMoney, resourcePath, searchMarketplace, typeIdsInGroup } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { rateLimited } from "@/server/rate.ts";
import { photo } from "@/server/media.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; group?: string }> }) {
  const sp = await searchParams;
  if (await rateLimited("search")) return <p className="alert" role="alert">Too many searches. Please wait a minute.</p>;
  const d = deps();
  const cats = categories();
  const group = cats.find((c) => c.group === sp.group);
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));
  const found = group ? { query: "", businesses: await d.store.listPublicBusinesses(50, 0, undefined, typeIdsInGroup(group.group)), products: [], events: [] } : await searchMarketplace(d, sp.q ?? "");
  const empty = found.businesses.length + found.products.length + found.events.length === 0;
  return (
    <>
      <h1>{group ? group.label : "Search"}</h1>
      <form action="/search" method="get" role="search" className="row"><input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search businesses, items and events" aria-label="Search" className="grow" maxLength={60} /><button className="btn btn-primary" type="submit">Search</button></form>
      <div className="row small" style={{ margin: "12px 0" }}>{cats.map((c) => <Link key={c.group} className="badge" href={`/search?group=${c.group}`} aria-current={group?.group === c.group ? "true" : undefined}>{c.label}</Link>)}</div>
      {empty && (found.query.length >= 2 || group) && <p className="notice">Nothing found{found.query ? ` for "${found.query}"` : ""}. Try a shorter word, or browse a category above.</p>}
      {found.businesses.length > 0 && (<><h2>Businesses</h2><div className="grid">{found.businesses.map((b) => (<Link key={b.id} className="card cover" href={`/b/${b.slug}`}><h3>{b.name}</h3><p className="muted small">{label.get(b.typeId) ?? "Business"}</p></Link>))}</div></>)}
      {found.products.length > 0 && (<><h2>Items</h2><div className="grid">{found.products.map(({ product: p, business: b }) => (
        <Link key={p.id} className="card cover" href={resourcePath("p", p.name, p.shortId)}>{photo(b.id, p.imageAssetId, "card") && <img className="photo" src={photo(b.id, p.imageAssetId, "card")!} alt={p.name} width={480} height={360} loading="lazy" />}<h3>{p.name}</h3><p><strong>{fmtMoney(p.priceMinor, p.currency)}</strong></p><p className="muted small">{b.name}</p></Link>))}</div></>)}
      {found.events.length > 0 && (<><h2>Events</h2><div className="grid">{found.events.map(({ event: e, business: b }) => (<Link key={e.id} className="card cover" href={resourcePath("e", e.name, e.shortId)}><h3>{e.name}</h3><p className="muted small">{fmtLocal(e.startsAtMs, b.timezone)}<br />{b.name}</p></Link>))}</div></>)}
    </>
  );
}
