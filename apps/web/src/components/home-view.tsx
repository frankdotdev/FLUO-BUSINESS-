"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type BusinessRecord, BUSINESS_TYPES, isBusinessOpenNow } from "@fluo/core";

interface HomeViewProps {
  initialBusinesses: BusinessRecord[];
  favoriteIds?: string[];
}

export function HomeView({ initialBusinesses, favoriteIds = [] }: HomeViewProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [bookingOnly, setBookingOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(favoriteIds));

  const labelMap = useMemo(() => new Map(BUSINESS_TYPES.map((t) => [t.id, t.label])), []);

  // Featured stores fallback if database is empty or fresh
  const fallbackStores = [
    {
      id: "bukka-house",
      slug: "search?group=food",
      name: "Bukka House",
      category: "Food",
      categoryLabel: "Local favourites · Nigerian",
      rating: "4.8",
      meta: "₦₦ · 15–25 min",
      tag: "Delivery",
      tagClass: "delivery-tag",
      photoClass: "food-photo photo-bukka",
      photoContent: (
        <div className="photo-caption">
          BH<span>.</span>
        </div>
      ),
      searchTags: "bukka house jollof rice food restaurant",
    },
    {
      id: "corner-market",
      slug: "search?group=retail",
      name: "Corner Market",
      category: "Retail",
      categoryLabel: "Groceries · Everyday essentials",
      rating: "4.7",
      meta: "₦ · 10–20 min",
      tag: "Pickup",
      tagClass: "delivery-tag",
      photoClass: "market-photo",
      photoContent: (
        <div className="market-illustration">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <b>
            CORNER<br />MARKET
          </b>
        </div>
      ),
      searchTags: "corner market groceries snacks drinks supermarket",
    },
    {
      id: "the-studio",
      slug: "search?group=beauty",
      name: "The Studio",
      category: "Beauty",
      categoryLabel: "Barbering · Grooming",
      rating: "4.9",
      meta: "From ₦2,000",
      tag: "Book a slot",
      tagClass: "delivery-tag booking-tag",
      photoClass: "studio-photo",
      photoContent: (
        <div className="studio-sign">
          THE<br />
          <strong>STUDIO</strong>
          <small>BARBER &amp; GROOMING</small>
        </div>
      ),
      searchTags: "the studio barber haircut beauty salon",
    },
    {
      id: "swift-fix",
      slug: "search?group=services",
      name: "SwiftFix",
      category: "Services",
      categoryLabel: "Phone repairs · Electronics",
      rating: "4.6",
      meta: "Same-day service",
      tag: "Get a quote",
      tagClass: "delivery-tag booking-tag",
      photoClass: "repair-photo",
      photoContent: (
        <div className="repair-device">
          <div></div>
          <span>swiftfix</span>
        </div>
      ),
      searchTags: "swiftfix phone repairs electronics services",
    },
  ];

  // Convert live businesses or fallback
  const storeCards = useMemo(() => {
    if (initialBusinesses.length > 0) {
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
          rating: "4.8",
          meta: b.acceptsAutomatic ? "Pay Online · Fast" : "Direct Transfer",
          tag: b.allowsTransfer ? "Available" : "Verified",
          tagClass: "delivery-tag",
          photoClass: photoStyle,
          photoContent: (
            <div className="photo-caption" style={{ fontSize: 26 }}>
              {b.name.slice(0, 2).toUpperCase()}
              <span>.</span>
            </div>
          ),
          searchTags: `${b.name} ${typeName} ${b.slug}`.toLowerCase(),
          isOpen: openStatus.isOpen,
        };
      });
    }
    return fallbackStores;
  }, [initialBusinesses, labelMap]);

  // Client-side filtering logic matching reference code
  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storeCards.filter((card) => {
      const matchCategory = activeCategory === "All" || card.category === activeCategory;
      const matchSearch = !q || (card.searchTags + " " + card.name + " " + card.categoryLabel).toLowerCase().includes(q);
      const matchOpen = !openOnly || true;
      const matchDelivery = !deliveryOnly || card.tag === "Delivery" || card.tag === "Pickup";
      const matchBooking = !bookingOnly || card.tagClass.includes("booking-tag");
      return matchCategory && matchSearch && matchOpen && matchDelivery && matchBooking;
    });
  }, [storeCards, activeCategory, searchQuery, openOnly, deliveryOnly, bookingOnly]);

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          <p>Discover local businesses, get things done, and keep your everyday moving &mdash; all in one place.</p>
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
            placeholder="Search shops, food, services..."
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

      {/* 2. Category Section */}
      <section className="category-section section-wrap">
        <div className="section-heading">
          <div>
            <span className="section-kicker">EXPLORE FLUO</span>
            <h2>What are you looking for?</h2>
          </div>
          <Link href="/search" className="text-button" id="viewAllCategories">
            View all <span>&nearr;</span>
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

      {/* 3. Feature Banner (Group Ordering & CSS Art) */}
      <section className="feature-banner section-wrap">
        <div className="feature-content">
          <span className="feature-label">
            <span className="spark"></span> A BETTER WAY TO ORDER
          </span>
          <h2>
            Good things happen<br />when we <em>share.</em>
          </h2>
          <p>Bring everyone into one cart. Everyone picks what they want and pays their own share. No chasing transfers.</p>
          <Link href="/cart/new" className="primary-button" id="groupCartCta">
            Explore group ordering <span>&nearr;</span>
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
              <small>&#8358;2,500 &middot; Jollof + chicken</small>
            </span>
            <span className="check">&#10003;</span>
          </div>
          <div className="floating-card progress-card">
            <span className="progress-title">GROUP ORDER</span>
            <b>3 of 4 paid</b>
            <div className="mini-progress">
              <i></i>
            </div>
            <small>Almost there &mdash; 75%</small>
          </div>
        </div>
      </section>

      {/* 4. Handpicked / Featured Stores Grid */}
      <section className="section-wrap new-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">HANDPICKED FOR YOU</span>
            <h2>Worth checking out</h2>
          </div>
          <Link href="/search" className="text-button" id="viewAllStores">
            See all <span>&nearr;</span>
          </Link>
        </div>

        <div className="store-grid" id="storeGrid">
          {filteredStores.map((store) => {
            const isSaved = savedIds.has(store.id);
            return (
              <Link key={store.id} href={`/${store.slug}`} className="store-card">
                <div className={`store-image ${store.photoClass}`}>
                  <span className="open-badge">
                    <i></i> Open now
                  </span>
                  <button
                    type="button"
                    className={`save-btn ${isSaved ? "saved" : ""}`}
                    onClick={(e) => toggleSave(store.id, e)}
                    aria-label={`Save ${store.name}`}
                  >
                    {isSaved ? "♥" : "♡"}
                  </button>
                  {store.photoContent}
                </div>

                <div className="store-details">
                  <div className="store-title-row">
                    <h3>{store.name}</h3>
                    <span className="rating">&starf; {store.rating}</span>
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

        {filteredStores.length === 0 && (
          <div className="empty-state" id="emptyState">
            <span>Nothing here just yet.</span>
            <p>Try another search or category.</p>
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
              Clear filters &nearr;
            </button>
          </div>
        )}
      </section>

      {/* 5. Trust Strip */}
      <section className="trust-strip section-wrap">
        <div className="trust-item">
          <span className="trust-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
              <path d="m8 12 2.5 2.5L16 9" />
            </svg>
          </span>
          <div>
            <b>Safer handoffs</b>
            <p>Inspect your order before release with Fluo Escrow.</p>
          </div>
        </div>

        <div className="trust-item">
          <span className="trust-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16v14H4z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </span>
          <div>
            <b>One place to manage</b>
            <p>Orders, bookings, receipts, and group splits.</p>
          </div>
        </div>

        <div className="trust-item">
          <span className="trust-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2-5.3L4 9" />
              <path d="M4 4v5h5M12 8v4l3 2" />
            </svg>
          </span>
          <div>
            <b>Built for real life</b>
            <p>Made for how campuses and communities actually trade.</p>
          </div>
        </div>
      </section>

      {/* 6. Filter Modal */}
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
                &times;
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
                Apply filters <span>&nearr;</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
