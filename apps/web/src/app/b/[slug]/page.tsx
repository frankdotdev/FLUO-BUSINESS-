import Link from "next/link";
import { notFound } from "next/navigation";
import { BUSINESS_TYPES, describePolicy, fmtMoney, isBusinessOpenNow, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { startChatAction, toggleFavoriteBusinessAction, createGroupCartAction } from "@/app/actions.ts";
import { getSession } from "@/server/session.ts";
import { photo } from "@/server/media.ts";
import { friendly } from "@/server/messages.ts";
import { IconShield, IconHeart, IconUsers, IconMessageSquare, IconStar, IconArrowRight } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await deps().store.getPublicBusinessBySlug((await params).slug);
  if (!b) return { title: "Not found" };
  const type = BUSINESS_TYPES.find((t) => t.id === b.typeId)?.label ?? "Business";
  const ogUrl = `/api/og?title=${encodeURIComponent(b.name)}&subtitle=${encodeURIComponent(`${type} on Fluo • Order online & transfer`)}&badge=Verified+Store`;
  return {
    title: `${b.name} — Fluo`,
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

export default async function Storefront({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
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
  const logoUrl = photo(b.id, b.logoAssetId, "card");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Fluo</Link>
        <span>/</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{b.name}</span>
      </nav>

      {/* Store Header Banner */}
      <section style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: "clamp(20px, 4vw, 36px)",
        boxShadow: "var(--shadow)",
        marginBottom: 32,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={b.name}
                width={80}
                height={80}
                style={{ width: 80, height: 80, borderRadius: 20, objectFit: "cover", border: "1px solid var(--line)" }}
              />
            ) : (
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: "var(--coral-soft)",
                color: "var(--coral-dark)",
                fontFamily: "Manrope, sans-serif",
                fontSize: 32,
                fontWeight: 800,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(240, 120, 102, 0.2)",
              }}>
                {b.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span className="section-kicker" style={{ margin: 0 }}>{type.toUpperCase()}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                  <IconStar size={13} style={{ color: "#f59e0b", fill: "#f59e0b" }} /> 4.9
                </span>
              </div>
              <h1 style={{
                margin: "0 0 8px",
                fontFamily: "Manrope, sans-serif",
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 800,
                letterSpacing: "-1.2px",
                color: "var(--ink)",
              }}>
                {b.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="open-badge" style={{ position: "static" }}>
                  <i style={{ background: openStatus.isOpen ? "var(--green)" : "#e53e3e" }}></i>
                  {openStatus.label}
                </span>
                {b.acceptsAutomatic && <span className="delivery-tag">Instant card/bank</span>}
                {b.allowsTransfer && <span className="delivery-tag booking-tag">Direct transfer</span>}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#edf6f0",
                  color: "var(--green)",
                  padding: "4px 10px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  <IconShield size={12} /> Fluo Escrow Protected
                </span>
              </div>
            </div>
          </div>

          {/* Action Strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <form action={toggleFavoriteBusinessAction} style={{ display: "inline" }}>
              <input type="hidden" name="businessId" value={b.id} />
              <input type="hidden" name="back" value={`/b/${b.slug}`} />
              <button
                className="secondary-button"
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: isFav ? "var(--coral-dark)" : "var(--ink)",
                  borderColor: isFav ? "var(--coral)" : "var(--line)",
                  background: isFav ? "var(--coral-soft)" : "#ffffff",
                }}
              >
                <IconHeart size={15} fill={isFav ? "var(--coral-dark)" : "none"} />
                {isFav ? "Saved Spot" : "Save Spot"}
              </button>
            </form>

            <form action={startChatAction} style={{ display: "inline" }}>
              <input type="hidden" name="businessId" value={b.id} />
              <input type="hidden" name="back" value={`/b/${b.slug}`} />
              <button
                className="secondary-button"
                type="submit"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <IconMessageSquare size={15} />
                Message
              </button>
            </form>

            <details style={{ position: "relative" }}>
              <summary
                className="primary-button"
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconUsers size={15} />
                Group Cart <span>↗</span>
              </summary>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: 18,
                  padding: 20,
                  boxShadow: "var(--shadow)",
                  width: 320,
                  zIndex: 40,
                }}
              >
                <form action={createGroupCartAction}>
                  <input type="hidden" name="businessId" value={b.id} />
                  <input type="hidden" name="back" value={`/b/${b.slug}`} />
                  <span className="section-kicker" style={{ margin: "0 0 4px" }}>GROUP ORDERING</span>
                  <h3 style={{ margin: "0 0 6px", fontFamily: "Manrope, sans-serif", fontSize: 16 }}>Pool &amp; Split with Friends</h3>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                    Everyone picks their favourite items and pays their own share directly into escrow.
                  </p>
                  <label style={{ display: "grid", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
                    Your Name
                    <input
                      name="hostName"
                      defaultValue={session?.user.name ?? ""}
                      required
                      placeholder="e.g. Frank"
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
                    Your Email
                    <input
                      name="hostEmail"
                      type="email"
                      defaultValue={session?.user.email ?? ""}
                      required
                      placeholder="frank@example.com"
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    />
                  </label>
                  <button type="submit" className="primary-button" style={{ width: "100%", justifyContent: "center" }}>
                    Start Shared Cart <span>↗</span>
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>

        {/* Refund Policy & Escrow Guarantee Note */}
        <div style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid #f0f1f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12,
          color: "var(--muted)",
        }}>
          <span>{describePolicy(b.refundPolicy)}</span>
          <span style={{ color: "var(--green)", fontWeight: 600 }}>Zero risk · Customer inspection before payout</span>
        </div>
      </section>

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

      {/* Catalogue Section */}
      <section>
        <div className="section-heading" style={{ marginBottom: 20 }}>
          <div>
            <span className="section-kicker">AVAILABLE ITEMS</span>
            <h2>Catalogue &amp; Menu</h2>
          </div>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{products.length} {products.length === 1 ? "item" : "items"}</span>
        </div>

        {products.length === 0 ? (
          <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)" }}>
            <span>▤</span>
            <b>Nothing listed yet</b>
            <p>This business hasn’t published products yet. Message the owner or check back shortly.</p>
            <form action={startChatAction}>
              <input type="hidden" name="businessId" value={b.id} />
              <input type="hidden" name="back" value={`/b/${b.slug}`} />
              <button className="primary-button" type="submit">
                Ask the seller <span>↗</span>
              </button>
            </form>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
          }}>
            {products.map((p) => {
              const imgUrl = photo(b.id, p.imageAssetId, "card");
              const isSoldOut = p.stockQuantity === 0;
              const isLowStock = p.stockQuantity != null && p.stockQuantity > 0 && p.stockQuantity <= 5;
              return (
                <Link
                  key={p.id}
                  href={resourcePath("p", p.name, p.shortId)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--line)",
                    borderRadius: 20,
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                  }}
                  className="store-card"
                >
                  <div style={{
                    height: 180,
                    background: "var(--canvas)",
                    position: "relative",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                  }}>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={p.name}
                        width={480}
                        height={360}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        color: "var(--muted)",
                        fontFamily: "Manrope, sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        opacity: 0.5,
                      }}>
                        {b.name}
                      </div>
                    )}
                    {isSoldOut ? (
                      <span className="open-badge" style={{ background: "rgba(220, 38, 38, 0.9)" }}>Sold out</span>
                    ) : isLowStock ? (
                      <span className="open-badge" style={{ background: "rgba(217, 119, 6, 0.9)" }}>Only {p.stockQuantity} left</span>
                    ) : p.fulfilment === "made_to_order" ? (
                      <span className="open-badge" style={{ background: "rgba(23, 33, 38, 0.85)" }}>Made to order</span>
                    ) : null}
                  </div>
                  <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{
                        margin: "0 0 6px",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "-0.4px",
                        color: "var(--ink)",
                      }}>
                        {p.name}
                      </h3>
                      {p.description && (
                        <p style={{
                          margin: "0 0 10px",
                          fontSize: 12,
                          color: "var(--muted)",
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                          {p.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                      <strong style={{
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--ink)",
                      }}>
                        {fmtMoney(p.priceMinor, p.currency)}
                      </strong>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        color: "var(--coral-dark)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        Order <IconArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust Strip */}
      <section className="trust-strip" style={{ marginTop: 48 }}>
        <div className="trust-item">
          <span className="trust-icon">
            <IconShield size={18} />
          </span>
          <div>
            <b>Escrow Protection</b>
            <p>Your money is held safely until you verify your items.</p>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon">
            <IconUsers size={18} />
          </span>
          <div>
            <b>Group Ordering</b>
            <p>Order together with friends and split the payment instantly.</p>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon">
            <IconMessageSquare size={18} />
          </span>
          <div>
            <b>Direct Line to Merchant</b>
            <p>Chat directly with {b.name} for custom requests or support.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
