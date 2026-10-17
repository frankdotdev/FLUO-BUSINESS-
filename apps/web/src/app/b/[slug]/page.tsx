import Link from "next/link";
import { notFound } from "next/navigation";
import { BUSINESS_TYPES, describePolicy, fmtMoney, isBusinessOpenNow, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { startChatAction, toggleFavoriteBusinessAction, createGroupCartAction } from "@/app/actions.ts";
import { getSession } from "@/server/session.ts";
import { photo } from "@/server/media.ts";
import { friendly } from "@/server/messages.ts";
import { IconShield, IconHeart, IconUsers } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await deps().store.getPublicBusinessBySlug((await params).slug);
  if (!b) return { title: "Not found" };
  const type = BUSINESS_TYPES.find((t) => t.id === b.typeId)?.label ?? "Business";
  const ogUrl = `/api/og?title=${encodeURIComponent(b.name)}&subtitle=${encodeURIComponent(`${type} on Fluo • Order online & transfer`)}&badge=Verified+Store`;
  return {
    title: b.name,
    description: `Order from ${b.name} on Fluo. ${type}. Safe payments and fast local delivery.`,
    openGraph: {
      title: `${b.name} | Fluo`,
      description: `Order from ${b.name} on Fluo. ${type}.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: b.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: b.name,
      description: `Order from ${b.name} on Fluo`,
      images: [ogUrl],
    },
  };
}

export default async function Storefront({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const d = deps();
  const b = await d.store.getPublicBusinessBySlug((await params).slug);
  if (!b) notFound();
  const session = await getSession();
  const [products, isFav] = await Promise.all([
    d.store.listProducts(b.id, ["active"], 100, 0),
    session ? d.store.isFavoriteBusiness(session.user.id, b.id) : Promise.resolve(false),
  ]);
  const msg = friendly((await searchParams).error);
  const type = BUSINESS_TYPES.find((t) => t.id === b.typeId)?.label ?? "Business";
  const openStatus = isBusinessOpenNow(null, b.timezone);
  return (
    <>
      <div className="row">{photo(b.id, b.logoAssetId, "card") && <img className="logo" src={photo(b.id, b.logoAssetId, "card")!} alt="" width={56} height={56} />}<h1 style={{ margin: 0 }}>{b.name}</h1></div>
      <p className="muted">{type}</p>
      <div className="row small">
        <span className={`badge ${openStatus.isOpen ? "ok" : "warn"}`}>{openStatus.label}</span>
        {b.acceptsAutomatic && <span className="badge ok">Pay online</span>}
        {b.allowsTransfer && <span className="badge">Bank transfer</span>}
        <span className="badge ok" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>
          <IconShield size={13} /> Escrow protected
        </span>
      </div>
      <p className="small">{describePolicy(b.refundPolicy)}</p>
      {msg && <p className="alert" role="alert">{msg}</p>}
      
      <div className="row" style={{ gap: 8, margin: "14px 0" }}>
        <form action={toggleFavoriteBusinessAction} style={{ display: "inline" }}>
          <input type="hidden" name="businessId" value={b.id} />
          <input type="hidden" name="back" value={`/b/${b.slug}`} />
          <button className="btn" type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={isFav ? "Remove from regular spots" : "Save as regular spot"}>
            <IconHeart size={15} fill={isFav ? "#ef4444" : "none"} style={{ color: isFav ? "#ef4444" : "currentColor" }} />
            {isFav ? "Regular Spot" : "Save Spot"}
          </button>
        </form>

        <form action={startChatAction} style={{ display: "inline" }}>
          <input type="hidden" name="businessId" value={b.id} />
          <input type="hidden" name="back" value={`/b/${b.slug}`} />
          <button className="btn" type="submit">Message</button>
        </form>

        <details style={{ display: "inline-block" }}>
          <summary className="btn" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconUsers size={15} /> Group Cart
          </summary>
          <form action={createGroupCartAction} className="card" style={{ marginTop: 8, maxWidth: 300, position: "absolute", zIndex: 10 }}>
            <input type="hidden" name="businessId" value={b.id} />
            <input type="hidden" name="back" value={`/b/${b.slug}`} />
            <h4 style={{ margin: "0 0 6px" }}>Pool &amp; Split with Friends</h4>
            <p className="small muted" style={{ margin: "0 0 8px" }}>Create a shareable link where friends can add items and split the bill.</p>
            <input name="hostName" defaultValue={session?.user.name ?? ""} required placeholder="Your name" style={{ marginBottom: 6, width: "100%" }} />
            <input name="hostEmail" type="email" defaultValue={session?.user.email ?? ""} required placeholder="Your email" style={{ marginBottom: 8, width: "100%" }} />
            <button type="submit" className="btn btn-primary btn-block">Create Shared Cart</button>
          </form>
        </details>
      </div>
      <h2>What's available</h2>
      {products.length === 0 ? <p className="notice">Nothing listed yet.</p> : (
        <div className="grid">{products.map((p) => (
          <Link key={p.id} className="card cover" href={resourcePath("p", p.name, p.shortId)}>{photo(b.id, p.imageAssetId, "card") && <img className="photo" src={photo(b.id, p.imageAssetId, "card")!} alt={p.name} width={480} height={360} loading="lazy" />}<h3>{p.name}</h3><p><strong>{fmtMoney(p.priceMinor, p.currency)}</strong></p>{p.fulfilment === "made_to_order" && <span className="badge">Made to order</span>}{p.stockQuantity === 0 && <span className="badge bad">Sold out</span>}{p.stockQuantity != null && p.stockQuantity > 0 && p.stockQuantity <= 5 && <span className="badge warn">Only {p.stockQuantity} left</span>}</Link>
        ))}</div>
      )}
    </>
  );
}
