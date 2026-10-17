import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { allowedMethods, describePolicy, fmtMoney, needsRedirect, parseResourcePath, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { photo } from "@/server/media.ts";
import { placeOrderAction } from "@/app/actions.ts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const parsed = parseResourcePath(`/p/${handle}`);
  if (!parsed) return { title: "Item not found" };
  const found = await deps().store.getPublicProductByShortId(parsed.shortId);
  if (!found) return { title: "Item not found" };
  const { product: p, business: b } = found;
  const priceFormatted = fmtMoney(p.priceMinor, p.currency);
  const ogUrl = `/api/og?title=${encodeURIComponent(p.name)}&subtitle=${encodeURIComponent(`Available from ${b.name}`)}&price=${encodeURIComponent(priceFormatted)}&badge=Available+Now`;
  return {
    title: `${p.name} - ${b.name}`,
    description: p.description || `Order ${p.name} for ${priceFormatted} from ${b.name} on Fluo.`,
    openGraph: {
      title: `${p.name} (${priceFormatted}) | ${b.name}`,
      description: p.description || `Order ${p.name} from ${b.name} on Fluo.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: p.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.name} (${priceFormatted})`,
      description: `Order ${p.name} from ${b.name} on Fluo`,
      images: [ogUrl],
    },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ error?: string }> }) {
  const { handle } = await params;
  const parsed = parseResourcePath(`/p/${handle}`);
  if (!parsed) notFound();
  const found = await deps().store.getPublicProductByShortId(parsed.shortId);
  if (!found) notFound();
  const { product: p, business: b } = found;
  if (needsRedirect(parsed.slug, p.name)) redirect(resourcePath("p", p.name, p.shortId));   // renamed items keep working from old links
  const session = await getSession();
  const soldOut = p.stockQuantity === 0;
  const maxQty = p.stockQuantity != null ? Math.max(1, Math.min(p.maxPerOrder, p.stockQuantity)) : p.maxPerOrder;
  const methods = allowedMethods("order", p.priceMinor === 0n ? 1n : p.priceMinor, { provider: b.acceptsAutomatic, transfer: b.allowsTransfer });
  const back = `/p/${handle}`;
  const msg = friendly((await searchParams).error);
  return (
    <>
      <p className="small"><Link href={`/b/${b.slug}`}>{b.name}</Link></p>
      {photo(b.id, p.imageAssetId, "detail") && <img className="photo" src={photo(b.id, p.imageAssetId, "detail")!} alt={p.name} width={1200} height={900} style={{ maxWidth: 560 }} />}
      <h1>{p.name}</h1>
      <p><strong>{fmtMoney(p.priceMinor, p.currency)}</strong> {p.fulfilment === "made_to_order" && <span className="badge">Made to order, {p.leadTimeHours}h notice</span>}</p>
      {p.description && <p>{p.description}</p>}
      <p className="small">{describePolicy(b.refundPolicy)}</p>
      {msg && <p className="alert" role="alert">{msg}</p>}
      {p.stockQuantity != null && p.stockQuantity > 0 && p.stockQuantity <= 5 && <p><span className="badge warn">Only {p.stockQuantity} left</span></p>}
      {soldOut ? <p className="notice">Sold out. Message the seller to ask when it's back.</p> : methods.length === 0 ? <p className="notice">This business isn't taking orders yet.</p> : (
        <form action={placeOrderAction} className="card" style={{ maxWidth: 440 }}>
          <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="back" value={back} />
          <label htmlFor="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min={1} max={maxQty} defaultValue={1} required />
          {p.fulfilment === "made_to_order" && (<><label htmlFor="requiredBy">When do you need it?</label><input id="requiredBy" name="requiredBy" type="datetime-local" required /></>)}
          {!session && (<><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required minLength={2} /><label htmlFor="email">Email (your receipt and updates)</label><input id="email" name="email" type="email" autoComplete="email" required /></>)}
          <label htmlFor="note">Note for the seller (optional)</label><textarea id="note" name="note" maxLength={500} rows={2} />
          <fieldset style={{ border: 0, padding: 0, margin: "12px 0 0" }}><legend className="small"><strong>How would you like to pay?</strong></legend>
            {methods.includes("provider") && <label style={{ fontWeight: 400 }}><input type="radio" name="method" value="provider" defaultChecked style={{ width: "auto", minHeight: 0 }} /> Pay now with card or bank (instant)</label>}
            {methods.includes("bank_transfer") && <label style={{ fontWeight: 400 }}><input type="radio" name="method" value="bank_transfer" defaultChecked={!methods.includes("provider")} style={{ width: "auto", minHeight: 0 }} /> Transfer to the seller's account</label>}
          </fieldset>
          <label style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8, margin: "14px 0 8px" }}>
            <input type="checkbox" name="useEscrow" value="1" defaultChecked style={{ width: "auto", minHeight: 0 }} />
            <span className="small">🔒 <strong>Protect with Fluo Escrow</strong> (Seller paid only after you inspect and release delivery)</span>
          </label>
          <p><button className="btn btn-primary btn-block" type="submit">Place order</button></p>
          {!session && <p className="small muted">No account needed. You can sign up after to keep your orders in one place.</p>}
        </form>
      )}
    </>
  );
}
