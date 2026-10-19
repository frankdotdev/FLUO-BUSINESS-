import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { allowedMethods, describePolicy, fmtMoney, needsRedirect, parseResourcePath, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { photo } from "@/server/media.ts";
import { placeOrderAction, startChatAction } from "@/app/actions.ts";
import { IconShield, IconArrowRight, IconClock, IconStore, IconCheck } from "@/components/icons.tsx";
import { ProductGallery } from "@/components/product-gallery.tsx";
import { ShareModal } from "@/components/share-modal.tsx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const parsed = parseResourcePath(`/p/${handle}`);
  if (!parsed) return { title: "Item not found" };
  const found = await deps().store.getPublicProductByShortId(parsed.shortId);
  if (!found) return { title: "Item not found" };
  const { product: p, business: b } = found;
  const priceFormatted = fmtMoney(p.priceMinor, p.currency);
  const photoUrl = p.imageAssetId ? photo(b.id, p.imageAssetId, "card") : null;
  const ogUrl = `/api/og?title=${encodeURIComponent(p.name)}&subtitle=${encodeURIComponent(`Available from ${b.name} • Escrow Protected`)}&price=${encodeURIComponent(priceFormatted)}&badge=Escrow+Protected&category=${encodeURIComponent(p.category || "Product")}${photoUrl ? `&image=${encodeURIComponent(photoUrl)}` : ""}`;
  return {
    title: `${p.name} — ${b.name} on Fluo`,
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

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { handle } = await params;
  const parsed = parseResourcePath(`/p/${handle}`);
  if (!parsed) notFound();
  const found = await deps().store.getPublicProductByShortId(parsed.shortId);
  if (!found) notFound();
  const { product: p, business: b } = found;
  if (needsRedirect(parsed.slug, p.name)) redirect(resourcePath("p", p.name, p.shortId));

  const session = await getSession();
  const soldOut = p.stockQuantity === 0;
  const maxQty = p.stockQuantity != null ? Math.max(1, Math.min(p.maxPerOrder, p.stockQuantity)) : p.maxPerOrder;
  const methods = allowedMethods("order", p.priceMinor === 0n ? 1n : p.priceMinor, {
    provider: b.acceptsAutomatic,
    transfer: b.allowsTransfer,
  });
  const back = `/p/${handle}`;
  const msg = friendly((await searchParams).error);
  const assetIds = [
    ...(p.imageAssetId ? [p.imageAssetId] : []),
    ...(p.galleryAssetIds || []).filter((id) => id !== p.imageAssetId),
  ];
  const photoUrls = assetIds.map((id) => photo(b.id, id, "detail")).filter((url): url is string => Boolean(url));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Fluo</Link>
        <span>/</span>
        <Link href={`/b/${b.slug}`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IconStore size={13} /> {b.name}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{p.name}</span>
      </nav>

      {msg && (
        <div style={{
          padding: "12px 16px",
          background: "var(--coral-soft)",
          border: "1px solid var(--coral)",
          borderRadius: 12,
          color: "var(--coral-dark)",
          marginBottom: 24,
          fontSize: 13,
          fontWeight: 600,
        }} role="alert">
          {msg}
        </div>
      )}

      {/* Main Product Layout: 2 columns on desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 40,
        alignItems: "start",
      }}>
        {/* Visuals & Details Column */}
        <div>
          <ProductGallery
            photos={photoUrls}
            productName={p.name}
            promoBadge={p.promoBadge}
            soldOut={soldOut}
            stockLeft={p.stockQuantity}
            fulfilment={p.fulfilment}
          />

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <span className="section-kicker">SOLD BY <Link href={`/b/${b.slug}`} style={{ color: "var(--coral-dark)", textDecoration: "none" }}>{b.name.toUpperCase()}</Link></span>
                <h1 style={{
                  margin: "6px 0 12px",
                  fontFamily: "Manrope, sans-serif",
                  fontSize: "clamp(26px, 3.2vw, 36px)",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  color: "var(--ink)",
                }}>
                  {p.name}
                </h1>
              </div>
              <ShareModal
                title={p.name}
                subtitle={`Available from ${b.name} • ${fmtMoney(p.priceMinor, p.currency)}`}
                price={fmtMoney(p.priceMinor, p.currency)}
                businessName={b.name}
                category={p.category || "Product"}
                type="product"
                path={back}
                imageUrl={photoUrls[0] || undefined}
                badge="Escrow Protected"
                label="Share Item"
              />
            </div>

            {/* Price & Discounts */}
            <div style={{ marginBottom: 16 }}>
              {p.promoBadge && (
                <div style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--coral-dark)",
                  background: "var(--coral-soft)",
                  border: "1px solid var(--coral)",
                  padding: "4px 9px",
                  borderRadius: 6,
                  marginBottom: 10,
                }}>
                  {p.promoBadge}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--ink)",
                }}>
                  {fmtMoney(p.priceMinor, p.currency)}
                </span>
                {p.compareAtPriceMinor != null && p.compareAtPriceMinor > p.priceMinor && (
                  <>
                    <span style={{
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 20,
                      color: "var(--muted)",
                      textDecoration: "line-through",
                    }}>
                      {fmtMoney(p.compareAtPriceMinor, p.currency)}
                    </span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: 8,
                      background: "var(--coral-soft)",
                      color: "var(--coral-dark)",
                    }}>
                      {Math.round(Number((p.compareAtPriceMinor - p.priceMinor) * 100n / p.compareAtPriceMinor))}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            {p.fulfilment === "made_to_order" && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 12,
                background: "var(--coral-soft)",
                color: "var(--coral-dark)",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
              }}>
                <IconClock size={15} />
                Requires approximately {p.leadTimeHours} hours preparation notice
              </div>
            )}

            {p.description && (
              <p style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "#4c575c",
                margin: "16px 0 24px",
              }}>
                {p.description}
              </p>
            )}

            <div style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: "#ffffff",
              border: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: 16,
            }}>
              <strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>Merchant Refund Policy:</strong>
              {describePolicy(b.refundPolicy)}
            </div>

            {/* Inquire / Chat with Seller */}
            <div style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: "#ffffff",
              border: "1px solid var(--line)",
            }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                Have a question about this item?
              </span>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                Chat directly with {b.name} for custom requirements, stock checks, or enquiries.
              </p>
              <form action={startChatAction}>
                <input type="hidden" name="businessId" value={b.id} />
                <input type="hidden" name="topic" value={`Inquiry: ${p.name}`} />
                <input type="hidden" name="back" value={back} />
                <button
                  type="submit"
                  className="secondary-button"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: 13,
                    padding: "10px 14px",
                  }}
                >
                  Ask Questions / Chat with Seller ↗
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Order / Checkout Card Column */}
        <div>
          <div style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: 24,
            padding: "clamp(20px, 3.5vw, 32px)",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <span className="section-kicker" style={{ margin: 0 }}>ORDER SUMMARY</span>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800 }}>
                  Place Your Order
                </h2>
              </div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--green)",
                background: "#edf6f0",
                padding: "4px 8px",
                borderRadius: 8,
              }}>
                <IconShield size={12} /> Protected
              </span>
            </div>

            {soldOut ? (
              <div className="empty-dashboard" style={{ padding: "24px 0" }}>
                <span>✕</span>
                <b>This item is currently sold out</b>
                <p>The merchant has run out of stock. You can message them to find out when new stock arrives.</p>
                <Link href={`/b/${b.slug}`} className="secondary-button">
                  Browse other items from {b.name}
                </Link>
              </div>
            ) : methods.length === 0 ? (
              <div className="empty-dashboard" style={{ padding: "24px 0" }}>
                <span>!</span>
                <b>Orders paused</b>
                <p>This business isn’t currently accepting online orders or bank transfers.</p>
                <Link href={`/b/${b.slug}`} className="secondary-button">
                  Return to storefront
                </Link>
              </div>
            ) : (
              <form action={placeOrderAction} style={{ display: "grid", gap: 16 }}>
                <input type="hidden" name="businessId" value={b.id} />
                <input type="hidden" name="productId" value={p.id} />
                <input type="hidden" name="back" value={back} />

                {/* Quantity */}
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                  Quantity
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    max={maxQty}
                    defaultValue={1}
                    required
                    style={{
                      padding: "11px 13px",
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  />
                </label>

                {/* Made to order datetime */}
                {p.fulfilment === "made_to_order" && (
                  <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                    When do you need it?
                    <input
                      id="requiredBy"
                      name="requiredBy"
                      type="datetime-local"
                      required
                      style={{
                        padding: "11px 13px",
                        borderRadius: 12,
                        border: "1px solid var(--line)",
                        fontSize: 14,
                        fontFamily: "inherit",
                      }}
                    />
                  </label>
                )}

                {/* Guest Contact Details */}
                {!session && (
                  <div style={{ display: "grid", gap: 14, padding: "14px", background: "var(--canvas)", borderRadius: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>CONTACT FOR RECEIPT &amp; UPDATES</span>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                      Full Name
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        placeholder="e.g. Frank Oge"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          fontSize: 13,
                          background: "#ffffff",
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                      Email Address
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          fontSize: 13,
                          background: "#ffffff",
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* Optional Note */}
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                  Note for Merchant (optional)
                  <textarea
                    id="note"
                    name="note"
                    maxLength={500}
                    rows={2}
                    placeholder="Special requests, dietary preferences, or delivery instructions"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </label>

                {/* Payment Options */}
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                    Payment Method
                  </span>
                  <div style={{ display: "grid", gap: 8 }}>
                    {methods.includes("provider") && (
                      <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: "#ffffff",
                      }}>
                        <input
                          type="radio"
                          name="method"
                          value="provider"
                          defaultChecked
                          style={{ accentColor: "var(--coral)", width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
                          Card or Instant Bank Payment <small style={{ color: "var(--muted)", fontWeight: 400 }}>(Instant confirmation)</small>
                        </span>
                      </label>
                    )}
                    {methods.includes("bank_transfer") && (
                      <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: "#ffffff",
                      }}>
                        <input
                          type="radio"
                          name="method"
                          value="bank_transfer"
                          defaultChecked={!methods.includes("provider")}
                          style={{ accentColor: "var(--coral)", width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
                          Direct Bank Transfer <small style={{ color: "var(--muted)", fontWeight: 400 }}>(Manual seller confirmation)</small>
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Escrow Guarantee Pill */}
                <div style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  background: "#edf6f0",
                  border: "1px solid #bfe3cc",
                  marginTop: 6,
                }}>
                  <label style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      name="useEscrow"
                      value="1"
                      defaultChecked
                      style={{ accentColor: "var(--green)", width: 18, height: 18, marginTop: 2 }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#166534" }}>
                        <IconShield size={14} /> Fluo Escrow Guarantee Enabled
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#1b4332", lineHeight: 1.5 }}>
                        Your funds are held securely by Fluo. The merchant receives payout only after you inspect and release delivery.
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  className="primary-button"
                  type="submit"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "14px 20px",
                    fontSize: 15,
                    marginTop: 8,
                  }}
                >
                  Place order <span>↗</span>
                </button>

                {!session && (
                  <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", margin: "4px 0 0" }}>
                    No account required. You will receive a receipt and order status link by email.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
