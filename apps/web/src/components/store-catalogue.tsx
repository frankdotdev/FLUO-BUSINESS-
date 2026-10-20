"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IconSearch, IconArrowRight, IconStore, IconCheck } from "@/components/icons.tsx";
import { ShareModal } from "@/components/share-modal.tsx";

export interface SerializedProduct {
  id: string;
  name: string;
  description: string | null;
  shortId: string;
  url: string;
  priceFormatted: string;
  priceMinor: number;
  currency: string;
  photoUrl: string | null;
  isSoldOut: boolean;
  isLowStock: boolean;
  stockQuantity: number | null;
  promoBadge: string | null;
  photoCount: number;
  category?: string;
}

interface StoreCatalogueProps {
  products: SerializedProduct[];
  businessName: string;
  businessSlug: string;
}

const PAGE_SIZE = 24;

export function StoreCatalogue({ products, businessName, businessSlug }: StoreCatalogueProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in_stock" | "offers">("all");
  const [sort, setSort] = useState<"featured" | "price_asc" | "price_desc">("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Extract categories / tags
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by tab
    if (filter === "in_stock") {
      list = list.filter((p) => !p.isSoldOut);
    } else if (filter === "offers") {
      list = list.filter((p) => Boolean(p.promoBadge));
    }

    // Filter by in-store search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sort === "price_asc") {
      list.sort((a, b) => a.priceMinor - b.priceMinor);
    } else if (sort === "price_desc") {
      list.sort((a, b) => b.priceMinor - a.priceMinor);
    }

    return list;
  }, [products, search, filter, sort]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Search, Filter & Sort Bar */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
      }}>
        {/* In-Store Search Input */}
        <div style={{ position: "relative", width: "100%" }}>
          <span style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)", pointerEvents: "none" }}>
            <IconSearch size={16} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={`Search ${products.length} products & services in ${businessName}...`}
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              border: "1px solid var(--line)",
              borderRadius: 12,
              fontSize: 13,
              background: "var(--surface)",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>

        {/* Filter Pills and Sort Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            <button
              type="button"
              onClick={() => { setFilter("all"); setVisibleCount(PAGE_SIZE); }}
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: filter === "all" ? "var(--ink)" : "var(--surface)",
                color: filter === "all" ? "#ffffff" : "var(--ink)",
                whiteSpace: "nowrap",
              }}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilter("in_stock"); setVisibleCount(PAGE_SIZE); }}
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: filter === "in_stock" ? "var(--ink)" : "var(--surface)",
                color: filter === "in_stock" ? "#ffffff" : "var(--ink)",
                whiteSpace: "nowrap",
              }}
            >
              In Stock
            </button>
            {products.some((p) => p.promoBadge) && (
              <button
                type="button"
                onClick={() => { setFilter("offers"); setVisibleCount(PAGE_SIZE); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: filter === "offers" ? "var(--coral-dark)" : "var(--surface)",
                  color: filter === "offers" ? "#ffffff" : "var(--coral-dark)",
                  whiteSpace: "nowrap",
                }}
              >
                Special Offers
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--line)",
                borderRadius: 10,
                fontSize: 12,
                background: "#ffffff",
                color: "var(--ink)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)", padding: 40 }}>
          <span>🔍</span>
          <b>No items match your filter</b>
          <p>Try searching for a different keyword or switch to "All Items".</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => { setSearch(""); setFilter("all"); }}
            style={{ width: "fit-content", margin: "0 auto" }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Responsive 2-Column Mobile Grid for Store Items */}
      {filteredProducts.length > 0 && (
        <div className="products-2col-grid">
          {visibleProducts.map((p) => (
            <Link
              key={p.id}
              href={p.url}
              className="product-card-compact"
            >
              <div className="product-card-thumb">
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    color: "var(--muted)",
                    fontFamily: "Manrope, sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    opacity: 0.7,
                    textAlign: "center",
                    padding: "0 8px",
                  }}>
                    {businessName}
                  </div>
                )}

                {/* Share Button on Card */}
                <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3 }}>
                  <ShareModal
                    title={p.name}
                    subtitle={`Available from ${businessName} • ${p.priceFormatted}`}
                    price={p.priceFormatted}
                    businessName={businessName}
                    type="product"
                    path={p.url}
                    imageUrl={p.photoUrl || undefined}
                    badge="Escrow Protected"
                    variant="icon"
                    label={`Share ${p.name}`}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.92)",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                </div>

                {p.promoBadge && (
                  <span style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: "var(--coral-dark)",
                    color: "#ffffff",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: 6,
                    zIndex: 2,
                  }}>
                    {p.promoBadge}
                  </span>
                )}

                {p.isSoldOut ? (
                  <span style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    background: "rgba(220, 38, 38, 0.9)",
                    color: "#ffffff",
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 5,
                    zIndex: 2,
                  }}>
                    Sold out
                  </span>
                ) : p.isLowStock ? (
                  <span style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    background: "rgba(245, 158, 11, 0.9)",
                    color: "#ffffff",
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 5,
                    zIndex: 2,
                  }}>
                    Only {p.stockQuantity} left
                  </span>
                ) : null}

                {p.photoCount > 1 && (
                  <span style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.65)",
                    color: "#ffffff",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 5px",
                    borderRadius: 5,
                    zIndex: 2,
                  }}>
                    {p.photoCount} photos
                  </span>
                )}
              </div>

              <div className="product-card-body">
                <div>
                  <h3 className="product-card-title">{p.name}</h3>
                  {p.description && (
                    <p className="product-card-subtitle">{p.description}</p>
                  )}
                </div>

                <div className="product-card-price-row">
                  <strong className="product-card-price">{p.priceFormatted}</strong>
                  <span className="product-card-cta">
                    Order <IconArrowRight size={10} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More Button for 100 to 1,000+ Items */}
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            style={{
              padding: "12px 28px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              background: "#ffffff",
              border: "1px solid var(--line)",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            Load More (Showing {visibleProducts.length} of {filteredProducts.length}) <span>↓</span>
          </button>
        </div>
      )}
    </div>
  );
}
