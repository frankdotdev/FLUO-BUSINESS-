"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type BusinessRecord, BUSINESS_TYPES, isBusinessOpenNow } from "@fluo/core";
import {
  IconSparkles,
  IconHeart,
  IconStar,
  IconShield,
  IconArrowRight,
  IconCalendar,
  IconStore,
  IconTicket,
  IconShoppingBag,
} from "@/components/icons.tsx";
import { toggleFavoriteBusinessAction } from "@/app/actions.ts";
import { ShareModal } from "@/components/share-modal.tsx";

export interface HomeProductItem {
  id: string;
  shortId: string;
  name: string;
  url: string;
  description: string | null;
  priceFormatted: string;
  compareAtPriceFormatted: string | null;
  discountPercent: number | null;
  promoBadge: string | null;
  photoUrl: string | null;
  photoCount: number;
  businessName: string;
  businessSlug: string;
}

export interface HomeEventItem {
  id: string;
  shortId: string;
  name: string;
  url: string;
  startsAtFormatted: string;
  businessName: string;
  businessSlug: string;
}

export interface HomeViewProps {
  initialBusinesses: (BusinessRecord & { logoUrl?: string | null })[];
  initialProducts?: HomeProductItem[];
  initialEvents?: HomeEventItem[];
  favoriteIds?: string[];
  regularBusinessIds?: string[];
  isAuthenticated?: boolean;
}

export function HomeView({
  initialBusinesses,
  initialProducts = [],
  initialEvents = [],
  favoriteIds = [],
  regularBusinessIds = [],
  isAuthenticated = false,
}: HomeViewProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [bookingOnly, setBookingOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(favoriteIds));

  const labelMap = useMemo(() => new Map(BUSINESS_TYPES.map((t) => [t.id, t.label])), []);

  // Convert raw businesses into rich store card objects
  const storeCards = useMemo(() => {
    return initialBusinesses.map((b, idx) => {
      const typeName = labelMap.get(b.typeId) || "Business";
      const openStatus = isBusinessOpenNow(null, b.timezone);
      let categoryGroup = "Retail";
      if (b.typeId.includes("food") || b.typeId.includes("restaurant") || b.typeId.includes("cafe")) categoryGroup = "Food";
      else if (b.typeId.includes("salon") || b.typeId.includes("barber") || b.typeId.includes("spa")) categoryGroup = "Beauty";
      else if (b.typeId.includes("repair") || b.typeId.includes("laundry") || b.typeId.includes("clean")) categoryGroup = "Services";
      else if (b.typeId.includes("keke") || b.typeId.includes("driver") || b.typeId.includes("ride") || b.typeId.includes("delivery")) categoryGroup = "Mobility";

      const photoStyle = idx % 4 === 0 ? "food-photo photo-bukka" : idx % 4 === 1 ? "market-photo" : idx % 4 === 2 ? "studio-photo" : "repair-photo";

      return {
        id: b.id,
        slug: `b/${b.slug}`,
        name: b.name,
        category: categoryGroup,
        categoryLabel: typeName,
        rating: "4.9",
        meta: b.acceptsAutomatic ? "Card & Instant Escrow" : "Direct Transfer",
        tag: b.allowsTransfer ? "Available" : "Verified",
        tagClass: "delivery-tag",
        photoClass: photoStyle,
        logoUrl: (b as any).logoUrl ?? null,
        acceptsAutomatic: b.acceptsAutomatic,
        allowsTransfer: b.allowsTransfer,
        publishedAtMs: b.publishedAtMs,
        searchTags: `${b.name} ${typeName} ${b.slug}`.toLowerCase(),
        isOpen: openStatus.isOpen,
      };
    });
  }, [initialBusinesses, labelMap]);

  // Regular spots: user's favorited or past ordered places
  const regularSpots = useMemo(() => {
    const regSet = new Set([...regularBusinessIds, ...Array.from(savedIds)]);
    return storeCards.filter((s) => regSet.has(s.id));
  }, [storeCards, regularBusinessIds, savedIds]);

  // Trending businesses: ranked by automated payments, open status, and verified trust
  const trendingStores = useMemo(() => {
    return [...storeCards].sort((a, b) => {
      if (a.acceptsAutomatic && !b.acceptsAutomatic) return -1;
      if (!a.acceptsAutomatic && b.acceptsAutomatic) return 1;
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      return 0;
    }).slice(0, 8);
  }, [storeCards]);

  // Fresh arrivals / new businesses
  const newStores = useMemo(() => {
    return [...storeCards].sort((a, b) => (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0)).slice(0, 8);
  }, [storeCards]);

  // Client-side filtering logic for the Explore All grid
  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storeCards.filter((card) => {
      const matchCategory = activeCategory === "All" || card.category === activeCategory;
      const matchSearch = !q || (card.searchTags + " " + card.name + " " + card.categoryLabel).toLowerCase().includes(q);
      const matchOpen = !openOnly || card.isOpen;
      const matchDelivery = !deliveryOnly || card.tag === "Delivery" || card.tag === "Pickup" || card.tag === "Available";
      const matchBooking = !bookingOnly || card.tagClass.includes("booking-tag");
      return matchCategory && matchSearch && matchOpen && matchDelivery && matchBooking;
    });
  }, [storeCards, activeCategory, searchQuery, openOnly, deliveryOnly, bookingOnly]);

  const toggleLocalSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSuggestion = (term: string) => {
    setSearchQuery(term);
    const gridEl = document.getElementById("storeGrid");
    if (gridEl) gridEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* 1. Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line"></span> YOUR COMMUNITY, CONNECTED
          </div>
          <h1>
            Your next find<br />is <span>closer than ever.</span>
          </h1>
          <p>Discover local businesses, get things done, and keep your everyday moving — all in one place.</p>
        </div>

        <form action="/search" method="get" role="search" className="hero-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            id="searchInput"
            name="q"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shops, food, services, events..."
            aria-label="Search businesses and services"
          />
          <button
            id="filterToggle"
            className="filter-button"
            type="button"
            aria-label="Show filters"
            onClick={() => setFilterModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M7 12h10M10 17h4" />
              <path d="M8 4v6M16 9v6M12 14v6" />
            </svg>
            <span>Filters</span>
          </button>
        </form>

        <div className="search-suggestions" id="searchSuggestions">
          <span>Try</span>
          <button type="button" onClick={() => handleSuggestion("jollof")}>
            Jollof rice
          </button>
          <button type="button" onClick={() => handleSuggestion("barber")}>
            Barbers
          </button>
          <button type="button" onClick={() => handleSuggestion("groceries")}>
            Groceries
          </button>
        </div>
      </section>

      {/* 2. Category Quick Filters */}
      <section className="category-section section-wrap">
        <div className="section-heading">
          <div>
            <span className="section-kicker">EXPLORE FLUO</span>
            <h2>What are you looking for?</h2>
          </div>
          <Link href="/search" className="text-button" id="viewAllCategories">
            View all <span>↗</span>
          </Link>
        </div>

        <div className="category-grid" id="categoryGrid">
          <button
            type="button"
            className={`category-card ${activeCategory === "All" ? "active" : ""}`}
            onClick={() => setActiveCategory("All")}
            data-category="All"
          >
            <span className="category-icon all-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 10.5 12 4l8 6.5V20H4z" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </span>
            <span>Everything</span>
          </button>

          <button
            type="button"
            className={`category-card ${activeCategory === "Food" ? "active" : ""}`}
            onClick={() => setActiveCategory("Food")}
            data-category="Food"
          >
            <span className="category-icon food-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 11h18l-2 9H5z" />
                <path d="M6 11a6 6 0 0 1 12 0M8 4l1 2M16 4l-1 2" />
              </svg>
            </span>
            <span>Food &amp; drinks</span>
          </button>

          <button
            type="button"
            className={`category-card ${activeCategory === "Retail" ? "active" : ""}`}
            onClick={() => setActiveCategory("Retail")}
            data-category="Retail"
          >
            <span className="category-icon retail-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9h16l-1 11H5z" />
                <path d="M3 9 5 4h14l2 5M9 9v3a3 3 0 0 0 6 0V9" />
              </svg>
            </span>
            <span>Shops</span>
          </button>

          <button
            type="button"
            className={`category-card ${activeCategory === "Beauty" ? "active" : ""}`}
            onClick={() => setActiveCategory("Beauty")}
            data-category="Beauty"
          >
            <span className="category-icon beauty-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v18M5 8h14M7 8l-3 5h6zM17 8l-3 5h6z" />
              </svg>
            </span>
            <span>Beauty</span>
          </button>

          <button
            type="button"
            className={`category-card ${activeCategory === "Services" ? "active" : ""}`}
            onClick={() => setActiveCategory("Services")}
            data-category="Services"
          >
            <span className="category-icon services-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5h14v15H5zM9 5V3h6v2M8 10h8M8 14h5" />
              </svg>
            </span>
            <span>Services</span>
          </button>

          <button
            type="button"
            className={`category-card ${activeCategory === "Mobility" ? "active" : ""}`}
            onClick={() => setActiveCategory("Mobility")}
            data-category="Mobility"
          >
            <span className="category-icon mobility-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 15 1-6h12l1 6M4 15h16v4H4z" />
                <circle cx="7" cy="19" r="1.5" />
                <circle cx="17" cy="19" r="1.5" />
                <path d="m8 9 2-4h4l2 4" />
              </svg>
            </span>
            <span>Rides &amp; delivery</span>
          </button>
        </div>
      </section>

      {/* 3. YOUR REGULAR SPOTS (If user has saved or re-ordered businesses) */}
      {regularSpots.length > 0 ? (
        <section className="section-wrap" style={{ marginTop: 12 }}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">YOUR REGULAR SPOTS</span>
              <h2>Frequented &amp; Saved Places</h2>
            </div>
            <Link href="/search?filter=favorites" className="text-button">
              See all <span>↗</span>
            </Link>
          </div>

          {/* Horizontal Snap Scroll on Mobile / Multi-column on Desktop */}
          <div className="horizontal-snap-row" style={{ marginTop: 12 }}>
            {regularSpots.map((store) => {
              const isSaved = savedIds.has(store.id);
              return (
                <div key={store.id} className="horizontal-snap-card">
                  <Link
                    href={`/${store.slug}`}
                    className="store-card"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "flex",
                      flexDirection: "column",
                      background: "#ffffff",
                      borderRadius: 20,
                      border: "1px solid var(--line)",
                      overflow: "hidden",
                      height: "100%",
                    }}
                  >
                  <div className={`store-image ${store.photoClass}`} style={{ height: 130 }}>
                    <span className="open-badge">
                      <i></i> {store.isOpen ? "Open now" : "Closed"}
                    </span>
                    <div style={{ position: "absolute", top: 10, right: 46, zIndex: 3 }}>
                      <ShareModal
                        title={store.name}
                        subtitle={`${store.categoryLabel} on Fluo • Escrow Protected`}
                        category={store.categoryLabel}
                        type="business"
                        path={`/b/${store.slug}`}
                        imageUrl={store.logoUrl || undefined}
                        badge="Verified Spot"
                        variant="icon"
                        label={`Share ${store.name}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.92)",
                          backdropFilter: "blur(8px)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      />
                    </div>
                    <form
                      action={toggleFavoriteBusinessAction}
                      style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}
                      onSubmit={() => toggleLocalSave(store.id)}
                    >
                      <input type="hidden" name="businessId" value={store.id} />
                      <input type="hidden" name="back" value="/" />
                      <button
                        type="submit"
                        className={`save-btn ${isSaved ? "saved" : ""}`}
                        aria-label={`Save ${store.name}`}
                      >
                        <IconHeart size={14} fill={isSaved ? "var(--coral-dark)" : "none"} color={isSaved ? "var(--coral-dark)" : "currentColor"} />
                      </button>
                    </form>
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div className="photo-caption" style={{ fontSize: 22 }}>
                        {store.name.slice(0, 2).toUpperCase()}
                        <span>.</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, fontFamily: "Manrope, sans-serif" }}>
                        {store.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{store.categoryLabel}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)" }}>Regular Spot</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--coral-dark)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        Visit <IconArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
          </div>
        </section>
      ) : !isAuthenticated ? (
        <section className="section-wrap" style={{ marginTop: 8 }}>
          <div style={{
            padding: "18px 24px",
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--coral-soft)",
                color: "var(--coral-dark)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}>
                <IconHeart size={20} fill="var(--coral-dark)" />
              </div>
              <div>
                <b style={{ display: "block", fontSize: 15, color: "var(--ink)" }}>Keep track of your regular spots</b>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Sign in to pin and re-order from your favourite food spots, shops, and services with one tap.</span>
              </div>
            </div>
            <Link href="/sign-in" className="secondary-button" style={{ fontSize: 13, padding: "8px 16px" }}>
              Sign In to Save Regulars ↗
            </Link>
          </div>
        </section>
      ) : null}

      {/* 4. TRENDING PRODUCTS & SERVICES */}
      {initialProducts.length > 0 && (
        <section className="section-wrap" style={{ marginTop: 24 }}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">AVAILABLE NOW</span>
              <h2>Trending Products &amp; Services</h2>
            </div>
            <Link href="/search?filter=products" className="text-button">
              See all <span>↗</span>
            </Link>
          </div>

          <div className="products-2col-grid">
            {initialProducts.slice(0, 8).map((p) => (
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
                      width={480}
                      height={360}
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
                      {p.businessName}
                    </div>
                  )}

                  <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3 }}>
                    <ShareModal
                      title={p.name}
                      subtitle={`Available from ${p.businessName} • ${p.priceFormatted}`}
                      price={p.priceFormatted}
                      businessName={p.businessName}
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
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--coral-dark)", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 2 }}>
                      {p.businessName}
                    </span>
                    <h3 className="product-card-title">{p.name}</h3>
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
        </section>
      )}

      {/* 5. UPCOMING & TRENDING EVENTS (Clarifying no subscription & 2% fee) */}
      {initialEvents.length > 0 && (
        <section className="section-wrap" style={{ marginTop: 24 }}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">COMMUNITY EXPERIENCES</span>
              <h2>Upcoming &amp; Trending Events</h2>
            </div>
            <Link href="/search?filter=events" className="text-button">
              See all <span>↗</span>
            </Link>
          </div>

          <div style={{
            background: "#edf6f0",
            border: "1px solid #bfe3cc",
            borderRadius: 16,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: "#166534",
            fontWeight: 600,
          }}>
            <IconTicket size={16} />
            <span>Hosting an event? Fluo requires zero monthly subscription for events — ticket processing is simply 2% per ticket at checkout.</span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {initialEvents.slice(0, 4).map((e) => (
              <Link
                key={e.id}
                href={e.url}
                className="store-card"
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: 20,
                  padding: "20px 22px",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div style={{ position: "absolute", top: 16, right: 16, zIndex: 3 }}>
                  <ShareModal
                    title={e.name}
                    subtitle={`Hosted by ${e.businessName} • ${e.startsAtFormatted}`}
                    businessName={e.businessName}
                    type="event"
                    path={e.url}
                    badge="Tickets Available"
                    variant="icon"
                    label={`Share ${e.name}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.92)",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingRight: 36 }}>
                    <span className="open-badge" style={{ position: "static" }}>
                      Tickets Available
                    </span>
                    <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>2% Ticket Fee</span>
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800 }}>
                    {e.name}
                  </h3>
                  <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <IconCalendar size={13} /> {e.startsAtFormatted}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{e.businessName}</span>
                  <span style={{ fontSize: 12, color: "var(--coral-dark)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    Get Tickets <IconArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. Group Ordering Banner */}
      <section className="feature-banner section-wrap" style={{ marginTop: 24 }}>
        <div className="feature-content">
          <span className="feature-label">
            <span className="spark"></span> A BETTER WAY TO ORDER
          </span>
          <h2>
            Good things happen<br />when we <em>share.</em>
          </h2>
          <p>Bring everyone into one cart. Everyone picks what they want and pays their own share. No chasing transfers.</p>
          <Link href="/cart/new" className="primary-button" id="groupCartCta">
            Explore group ordering <span>↗</span>
          </Link>
        </div>

        <div className="feature-art" aria-hidden="true">
          <div className="orbit orbit-one"></div>
          <div className="orbit orbit-two"></div>
          <div className="food-plate">
            <div className="plate-inner">
              <span className="food-leaf"></span>
              <span className="food-chicken"></span>
              <span className="food-rice"></span>
              <span className="food-tomato"></span>
            </div>
          </div>
          <div className="floating-card share-card">
            <span className="mini-avatar avatar-a">A</span>
            <span>
              <b>Ada paid</b>
              <small>₦2,500 • Jollof + chicken</small>
            </span>
            <span className="check">✓</span>
          </div>
          <div className="floating-card progress-card">
            <span className="progress-title">GROUP ORDER</span>
            <b>3 of 4 paid</b>
            <div className="mini-progress">
              <i></i>
            </div>
            <small>Almost there — 75%</small>
          </div>
        </div>
      </section>

      {/* 7. TRENDING BUSINESSES */}
      <section className="section-wrap" style={{ marginTop: 24 }}>
        <div className="section-heading">
          <div>
            <span className="section-kicker">TRENDING IN YOUR AREA</span>
            <h2>Popular Businesses</h2>
          </div>
          <Link href="/search" className="text-button">
            See all <span>↗</span>
          </Link>
        </div>

        <div className="store-grid">
          {trendingStores.map((store) => {
            const isSaved = savedIds.has(store.id);
            return (
              <Link key={store.id} href={`/${store.slug}`} className="store-card">
                <div className={`store-image ${store.photoClass}`}>
                  <span className="open-badge">
                    <i></i> {store.isOpen ? "Open now" : "Closed"}
                  </span>
                  <div style={{ position: "absolute", top: 10, right: 46, zIndex: 3 }}>
                    <ShareModal
                      title={store.name}
                      subtitle={`${store.categoryLabel} on Fluo • Escrow Protected`}
                      category={store.categoryLabel}
                      type="business"
                      path={`/b/${store.slug}`}
                      imageUrl={store.logoUrl || undefined}
                      badge="Verified Spot"
                      variant="icon"
                      label={`Share ${store.name}`}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.92)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    />
                  </div>
                  <form
                    action={toggleFavoriteBusinessAction}
                    style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}
                    onSubmit={() => toggleLocalSave(store.id)}
                  >
                    <input type="hidden" name="businessId" value={store.id} />
                    <input type="hidden" name="back" value="/" />
                    <button
                      type="submit"
                      className={`save-btn ${isSaved ? "saved" : ""}`}
                      aria-label={`Save ${store.name}`}
                    >
                      <IconHeart size={14} fill={isSaved ? "var(--coral-dark)" : "none"} color={isSaved ? "var(--coral-dark)" : "currentColor"} />
                    </button>
                  </form>
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="photo-caption" style={{ fontSize: 26 }}>
                      {store.name.slice(0, 2).toUpperCase()}
                      <span>.</span>
                    </div>
                  )}
                </div>

                <div className="store-details">
                  <div className="store-title-row">
                    <h3>{store.name}</h3>
                    <span className="rating"><IconStar size={12} style={{ fill: "#f59e0b", color: "#f59e0b" }} /> {store.rating}</span>
                  </div>
                  <p>{store.categoryLabel}</p>
                  <div className="store-meta">
                    <span>{store.meta}</span>
                    <span className={store.tagClass}>{store.tag}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 8. NEW BUSINESSES & FRESH ARRIVALS */}
      {newStores.length > 0 && (
        <section className="section-wrap new-section" style={{ marginTop: 24 }}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">FRESH ARRIVALS</span>
              <h2>New on Fluo</h2>
            </div>
            <Link href="/search" className="text-button">
              See all <span>↗</span>
            </Link>
          </div>

          <div className="store-grid" id="storeGrid">
            {filteredStores.map((store) => {
              const isSaved = savedIds.has(store.id);
              return (
                <Link key={store.id} href={`/${store.slug}`} className="store-card">
                  <div className={`store-image ${store.photoClass}`}>
                    <span className="open-badge">
                      <i></i> {store.isOpen ? "Open now" : "Closed"}
                    </span>
                    <div style={{ position: "absolute", top: 10, right: 46, zIndex: 3 }}>
                      <ShareModal
                        title={store.name}
                        subtitle={`${store.categoryLabel} on Fluo • Escrow Protected`}
                        category={store.categoryLabel}
                        type="business"
                        path={`/b/${store.slug}`}
                        imageUrl={store.logoUrl || undefined}
                        badge="Verified Spot"
                        variant="icon"
                        label={`Share ${store.name}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.92)",
                          backdropFilter: "blur(8px)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      />
                    </div>
                    <form
                      action={toggleFavoriteBusinessAction}
                      style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}
                      onSubmit={() => toggleLocalSave(store.id)}
                    >
                      <input type="hidden" name="businessId" value={store.id} />
                      <input type="hidden" name="back" value="/" />
                      <button
                        type="submit"
                        className={`save-btn ${isSaved ? "saved" : ""}`}
                        aria-label={`Save ${store.name}`}
                      >
                        <IconHeart size={14} fill={isSaved ? "var(--coral-dark)" : "none"} color={isSaved ? "var(--coral-dark)" : "currentColor"} />
                      </button>
                    </form>
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div className="photo-caption" style={{ fontSize: 26 }}>
                        {store.name.slice(0, 2).toUpperCase()}
                        <span>.</span>
                      </div>
                    )}
                  </div>

                  <div className="store-details">
                    <div className="store-title-row">
                      <h3>{store.name}</h3>
                      <span className="rating"><IconStar size={12} style={{ fill: "#f59e0b", color: "#f59e0b" }} /> {store.rating}</span>
                    </div>
                    <p>{store.categoryLabel}</p>
                    <div className="store-meta">
                      <span>{store.meta}</span>
                      <span className={store.tagClass}>{store.tag}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
          </div>

          {filteredStores.length === 0 && storeCards.length > 0 && (
            <div className="empty-state" id="emptyState">
              <span>Nothing matched your filters.</span>
              <p>Try another search or clear your filter selections.</p>
              <button
                type="button"
                className="text-button"
                id="clearFilters"
                onClick={() => {
                  setActiveCategory("All");
                  setSearchQuery("");
                  setOpenOnly(false);
                  setDeliveryOnly(false);
                  setBookingOnly(false);
                }}
              >
                Clear filters ↗
              </button>
            </div>
          )}

          {storeCards.length === 0 && (
            <div
              className="empty-state"
              id="emptyState"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "var(--surface)",
                borderRadius: "var(--radius-xl)",
                border: "1px dashed var(--border)",
                marginTop: 16,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <IconSparkles size={24} style={{ color: "var(--accent)" }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>
                No businesses discovered in this area yet
              </h3>
              <p
                style={{
                  maxWidth: 460,
                  margin: "0 auto 24px",
                  color: "var(--muted)",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Be the first business or merchant to bring your retail products, restaurant, bookings, or professional services online. Start completely free with our 30-day Growth trial — no card required.
              </p>
              <Link
                href="/app/new"
                className="primary-button"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "0 auto", textDecoration: "none" }}
              >
                <span>Open Your Store • Free Trial</span>
                <span>↗</span>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 9. Trust Strip */}
      <section className="trust-strip section-wrap" style={{ marginTop: 32 }}>
        <div className="trust-item">
          <span className="trust-icon">
            <IconShield size={22} />
          </span>
          <div>
            <b>Safer handoffs</b>
            <p>Inspect your order before release with Fluo Escrow.</p>
          </div>
        </div>

        <div className="trust-item">
          <span className="trust-icon">
            <IconShoppingBag size={22} />
          </span>
          <div>
            <b>One place to manage</b>
            <p>Orders, bookings, receipts, and group splits.</p>
          </div>
        </div>

        <div className="trust-item">
          <span className="trust-icon">
            <IconStore size={22} />
          </span>
          <div>
            <b>Built for real life</b>
            <p>Made for how campuses and communities actually trade.</p>
          </div>
        </div>
      </section>

      {/* 10. Filter Modal */}
      {filterModalOpen && (
        <div
          className="modal-backdrop open"
          id="filterModal"
          onClick={() => setFilterModalOpen(false)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filterTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-handle"></div>
            <div className="modal-head">
              <div>
                <span className="section-kicker">PERSONALISE YOUR FEED</span>
                <h2 id="filterTitle">Find your kind of place</h2>
              </div>
              <button
                type="button"
                className="close-modal"
                onClick={() => setFilterModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="modal-copy">Choose what matters and we’ll narrow things down.</p>
            <div className="filter-options">
              <label>
                <input
                  type="checkbox"
                  id="openOnly"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                />{" "}
                Open now
              </label>
              <label>
                <input
                  type="checkbox"
                  id="deliveryOnly"
                  checked={deliveryOnly}
                  onChange={(e) => setDeliveryOnly(e.target.checked)}
                />{" "}
                Offers delivery
              </label>
              <label>
                <input
                  type="checkbox"
                  id="bookingOnly"
                  checked={bookingOnly}
                  onChange={(e) => setBookingOnly(e.target.checked)}
                />{" "}
                Bookings &amp; services
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                id="resetFilters"
                onClick={() => {
                  setOpenOnly(false);
                  setDeliveryOnly(false);
                  setBookingOnly(false);
                  setActiveCategory("All");
                  setSearchQuery("");
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="primary-button"
                id="applyFilters"
                onClick={() => setFilterModalOpen(false)}
              >
                Apply filters <span>↗</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
