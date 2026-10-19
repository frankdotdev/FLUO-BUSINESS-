"use client";

import { useState } from "react";
import {
  IconSmartphone,
  IconShoppingBag,
  IconUtensils,
  IconScissors,
  IconZap,
  IconTicket,
  IconCar,
  IconLayers,
  IconCheck,
  IconArrowRight,
  IconShield,
  IconHelpCircle,
  IconPackage,
} from "@/components/icons.tsx";

interface NewBusinessFormProps {
  types: { id: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}

const FEATURED_VERTICALS = [
  {
    id: "phone_repair_retail",
    title: "Phone, Laptop & Electronics Repair / Tech Hub",
    badge: "Most Popular for Tech",
    badgeColor: "var(--coral-dark)",
    badgeBg: "var(--coral-soft)",
    icon: IconSmartphone,
    summary: "Fix screens, replace batteries, offer diagnostic quotes, and sell phones, chargers, and accessories.",
    pills: ["Repairs & Bookings", "Sell Accessories", "Diagnostic Quotes", "Escrow"],
    hasProducts: true,
  },
  {
    id: "retail",
    title: "Retail Store, Boutique & Supermarket",
    badge: "Everyday Retail",
    badgeColor: "#1d4ed8",
    badgeBg: "#dbeafe",
    icon: IconShoppingBag,
    summary: "Sell physical goods, fashion, provisions, mini-marts, and electronics with inventory & counter POS.",
    pills: ["Product Catalogue", "Stock & Inventory", "Counter POS", "Delivery & Pickup"],
    hasProducts: true,
  },
  {
    id: "restaurant",
    title: "Restaurant, Food Spot & Cafe",
    badge: "Food & Dining",
    badgeColor: "#b45309",
    badgeBg: "#fef3c7",
    icon: IconUtensils,
    summary: "Bukkas, restaurants, takeaways, fast food, and cloud kitchens with order preparation times.",
    pills: ["Digital Menu", "Order Ahead & WhatsApp", "Group Carts", "Table Reservations"],
    hasProducts: true,
  },
  {
    id: "salon_barber",
    title: "Barber, Hair Salon & Beauty Spa",
    badge: "Beauty & Grooming",
    badgeColor: "#7e22ce",
    badgeBg: "#f3e8ff",
    icon: IconScissors,
    summary: "Haircuts, braiding, grooming, makeup, styling, treatments, walk-ins, and booked appointments.",
    pills: ["Service Menu", "Appointment Scheduling", "Staff Assignment", "Advance Deposits"],
    hasProducts: false,
  },
  {
    id: "artisan_services",
    title: "Artisan & Home Services",
    badge: "Technicians & Crafts",
    badgeColor: "#047857",
    badgeBg: "#d1fae5",
    icon: IconZap,
    summary: "Plumbing, electrical, AC repair, carpentry, painting, and maintenance contractor services.",
    pills: ["Service Requests", "Work Invoices", "Escrow Protection", "Schedule Visits"],
    hasProducts: false,
  },
  {
    id: "event_organiser",
    title: "Event Organiser & Experience Host",
    badge: "2% Fee • Zero Subscription",
    badgeColor: "#0f766e",
    badgeBg: "#ccfbf1",
    icon: IconTicket,
    summary: "Concerts, conferences, parties, sports, and festivals. Sell tickets with fast QR check-in validation.",
    pills: ["Ticket Tiers", "QR Check-in Scanner", "Sales Dashboard", "0 Monthly Sub"],
    hasProducts: false,
  },
  {
    id: "keke_rider",
    title: "Mobility, Keke & Dispatch Courier",
    badge: "Mobility & Transport",
    badgeColor: "#374151",
    badgeBg: "#f3f4f6",
    icon: IconCar,
    summary: "Tricycle operators, motorcycle delivery couriers, private drivers with instant fare negotiation.",
    pills: ["Direct Ride Requests", "Fare Bargaining", "Driver Ratings", "Local Dispatch"],
    hasProducts: false,
  },
  {
    id: "general",
    title: "General Business / Multi-Vertical Hybrid",
    badge: "Fully Customizable",
    badgeColor: "#4338ca",
    badgeBg: "#e0e7ff",
    icon: IconLayers,
    summary: "For hybrid operations, consultants, or versatile businesses. Easily enable any combination of tools.",
    pills: ["Customer Enquiries", "Enable Any Engine", "Escrow Payments", "Full Customization"],
    hasProducts: false,
  },
];

export function NewBusinessForm({ types, action }: NewBusinessFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("phone_repair_retail");
  const [alsoSellProducts, setAlsoSellProducts] = useState(true);
  const [showAllTypes, setShowAllTypes] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (submitting) {
      e.preventDefault();
      return;
    }
    setSubmitting(true);
  };

  const handleSelectVertical = (id: string, defaultHasProducts: boolean) => {
    setSelectedType(id);
    if (defaultHasProducts) {
      setAlsoSellProducts(true);
    }
  };

  const selectedFeatured = FEATURED_VERTICALS.find((v) => v.id === selectedType);
  const selectedTypeLabel = types.find((t) => t.id === selectedType)?.label || selectedFeatured?.title || "Custom Business";

  return (
    <form action={action} onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
      {/* 1. Business Name */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "20px 22px",
      }}>
        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
          <span>Business Name <span style={{ color: "var(--coral-dark)" }}>*</span></span>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Kay Tech Hub, Mama Chichi Bites, Studio 24"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              fontSize: 15,
              outline: "none",
              fontFamily: "inherit",
              background: "var(--canvas)",
            }}
          />
        </label>
        <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, display: "block" }}>
          This will be your storefront name, receipts title, and official customer link.
        </span>
      </div>

      {/* 2. Choose Your Business Vertical (Laid down on the board) */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "clamp(16px, 4vw, 24px)",
      }}>
        <div style={{ marginBottom: 16 }}>
          <span className="section-kicker" style={{ margin: "0 0 2px" }}>SELECT YOUR VERTICAL</span>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: 0, color: "var(--ink)" }}>
            What best describes your business?
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
            Tap the card that matches your work. Fluo sets up your workspace with the exact machines and tools you need.
          </p>
        </div>

        {/* Hidden Form Input to pass to Server Action */}
        <input type="hidden" name="typeId" value={selectedType} />

        {/* Grid of Interactive Vertical Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
          gap: 14,
        }}>
          {FEATURED_VERTICALS.map((v) => {
            const isSelected = selectedType === v.id;
            const Icon = v.icon;
            return (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectVertical(v.id, v.hasProducts)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectVertical(v.id, v.hasProducts);
                  }
                }}
                style={{
                  border: isSelected ? "2px solid var(--coral)" : "1.5px solid var(--line)",
                  background: isSelected ? "#fffbfb" : "#ffffff",
                  borderRadius: 16,
                  padding: "16px 16px 14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 4px 14px rgba(240, 120, 102, 0.12)" : "none",
                  position: "relative",
                  outline: "none",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isSelected ? "var(--coral-soft)" : "var(--canvas)",
                      color: isSelected ? "var(--coral-dark)" : "var(--ink)",
                      display: "grid",
                      placeItems: "center",
                    }}>
                      <Icon size={18} />
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: v.badgeBg,
                      color: v.badgeColor,
                    }}>
                      {v.badge}
                    </span>
                  </div>

                  <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--ink)", lineHeight: 1.3, marginBottom: 5 }}>
                    {v.title}
                  </strong>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                    {v.summary}
                  </p>
                </div>

                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                    {v.pills.map((pill) => (
                      <span
                        key={pill}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: isSelected ? "#feece9" : "var(--canvas)",
                          color: isSelected ? "var(--coral-dark)" : "var(--muted)",
                        }}
                      >
                        ✓ {pill}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "var(--coral-dark)" : "var(--muted)" }}>
                      {isSelected ? "Selected Vertical" : "Tap to choose"}
                    </span>
                    <span style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: isSelected ? "none" : "1.5px solid var(--line)",
                      background: isSelected ? "var(--coral)" : "transparent",
                      color: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 800,
                    }}>
                      {isSelected ? "✓" : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dropdown for All 30+ Types */}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowAllTypes(!showAllTypes)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--coral-dark)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {showAllTypes ? "Hide other business types ↑" : "Browse all 30+ specific business types ↓"}
          </button>

          {showAllTypes && (
            <div style={{ marginTop: 10, padding: 14, background: "var(--canvas)", borderRadius: 14, border: "1px solid var(--line)" }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                <span>Search or pick any specific industry vertical</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    fontSize: 13,
                    background: "#ffffff",
                    outline: "none",
                  }}
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {/* Selected Vertical Confirmation Banner */}
        <div style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Chosen Vertical</span>
            <b style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>{selectedTypeLabel}</b>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", background: "#edf6f0", padding: "3px 8px", borderRadius: 6 }}>
            Ready to deploy
          </span>
        </div>
      </div>

      {/* 3. Hybrid Business: Also Sell Products / Accessories Checkbox */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "18px 22px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}>
        <input
          type="checkbox"
          id="alsoSellProducts"
          name="cap"
          value="catalogue"
          checked={alsoSellProducts}
          onChange={(e) => setAlsoSellProducts(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--coral)", cursor: "pointer" }}
        />
        <label htmlFor="alsoSellProducts" style={{ fontSize: 13, color: "var(--ink)", cursor: "pointer", lineHeight: 1.45 }}>
          <strong style={{ display: "block", fontSize: 13.5, color: "var(--ink)", marginBottom: 2 }}>
            I also sell products, spare parts, or accessories
          </strong>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            Perfect for phone repairers who sell phone cases/chargers, salons selling beauty oils, or service artisans selling materials. Adds the complete Product Catalogue &amp; Stock tracker to your workspace.
          </span>
        </label>
      </div>

      {/* 4. Clarification Note about "General Business" and Freedom of Engines */}
      <div style={{
        background: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: 18,
        padding: "16px 20px",
        fontSize: 12,
        color: "#0369a1",
        lineHeight: 1.55,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
          <IconHelpCircle size={15} />
          <span>Every business has full access to products and services</span>
        </div>
        <p style={{ margin: 0 }}>
          <strong>You are never restricted:</strong> Choosing your vertical simply customizes your starting layout and storefront tags.
          Every business on Fluo (including technicians, repair hubs, retail shops, salons, and food spots) can sell physical items, accept bookings, issue quotes, and take orders.
          <strong> "General Business"</strong> is simply an open template for multi-discipline businesses — it is <em>not</em> the only vertical with products!
        </p>
      </div>

      {/* 5. Customer Refund Policy */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "20px 22px",
        display: "grid",
        gap: 14,
      }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
          <span>Customer Refund Policy</span>
          <select
            id="refundKind"
            name="refundKind"
            defaultValue="none"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              fontSize: 13.5,
              background: "var(--canvas)",
              outline: "none",
            }}
          >
            <option value="none">No refunds (all sales &amp; repair services final)</option>
            <option value="full_until">Full refund if cancelled before cutoff window</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
          <span>Cancellation Notice Cutoff (Hours before appointment / order)</span>
          <input
            id="refundHours"
            name="refundHours"
            type="number"
            min={0}
            max={720}
            defaultValue={24}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              fontSize: 13.5,
              outline: "none",
              background: "var(--canvas)",
            }}
          />
        </label>
      </div>

      {/* 6. Submit Button */}
      <button
        className="primary-button"
        type="submit"
        disabled={submitting}
        style={{
          width: "100%",
          justifyContent: "center",
          padding: "16px 24px",
          fontSize: 15,
          fontWeight: 800,
          borderRadius: 16,
          opacity: submitting ? 0.7 : 1,
          cursor: submitting ? "not-allowed" : "pointer",
        }}
      >
        <span>{submitting ? "Launching workspace & storefront..." : "Create My Workspace & Start 30-Day Free Trial"}</span>
        {!submitting && <span>↗</span>}
      </button>
    </form>
  );
}
