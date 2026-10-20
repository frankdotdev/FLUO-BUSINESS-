"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IconStore, IconCheck, IconSearch, IconSparkles } from "@/components/icons.tsx";

export interface BusinessOption {
  id: string;
  name: string;
  slug: string;
  categoryLabel: string;
  logoUrl?: string | null;
  sampleItems?: string[];
}

export interface GroupCartBuilderProps {
  businesses: BusinessOption[];
  defaultHostName?: string;
  defaultHostEmail?: string;
  action: (formData: FormData) => void;
}

export function GroupCartBuilder({
  businesses,
  defaultHostName = "",
  defaultHostEmail = "",
  action,
}: GroupCartBuilderProps) {
  const [query, setQuery] = useState("");
  const [selectedBizId, setSelectedBizId] = useState<string>(businesses[0]?.id || "");
  const [splitKind, setSplitKind] = useState<"itemized" | "equal">("itemized");

  const filteredBusinesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => {
      const matchName = b.name.toLowerCase().includes(q);
      const matchCat = b.categoryLabel.toLowerCase().includes(q);
      const matchItems = b.sampleItems?.some((item) => item.toLowerCase().includes(q));
      return matchName || matchCat || matchItems;
    });
  }, [businesses, query]);

  const selectedBiz = useMemo(() => {
    return businesses.find((b) => b.id === selectedBizId) || businesses[0];
  }, [businesses, selectedBizId]);

  return (
    <form action={action} style={{ display: "grid", gap: 20 }}>
      <input type="hidden" name="back" value="/cart/new" />
      <input type="hidden" name="businessId" value={selectedBizId} />

      {/* Step 1: Search & Choose Business */}
      <div>
        <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 8, color: "var(--ink)" }}>
          1. What are you ordering? Search item, meal, or business
        </label>
        
        {/* Search input with search icon */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 14, top: 13, color: "var(--muted)", pointerEvents: "none" }}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Shawarma, Pizza, Drinks, Rice, or Store name..."
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              borderRadius: 14,
              border: "1.5px solid var(--line)",
              fontSize: 14,
              outline: "none",
              background: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          />
        </div>

        {/* Selected Store Indicator Card */}
        {selectedBiz && (
          <div style={{
            background: "#edf6f0",
            border: "1.5px solid #bfe3cc",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--green)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 15,
                flexShrink: 0,
              }}>
                ✓
              </div>
              <div>
                <strong style={{ fontSize: 14, color: "#166534", display: "block" }}>
                  Ordering from: {selectedBiz.name}
                </strong>
                <span style={{ fontSize: 11, color: "#15803d" }}>
                  {selectedBiz.categoryLabel}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", background: "#ffffff", padding: "4px 8px", borderRadius: 8, border: "1px solid #bfe3cc" }}>
              Selected
            </span>
          </div>
        )}

        {/* Quick select grid */}
        <div style={{
          maxHeight: 220,
          overflowY: "auto",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 8,
          background: "var(--canvas)",
          display: "grid",
          gap: 6,
        }}>
          {filteredBusinesses.length === 0 ? (
            <div style={{ padding: "20px 10px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              No businesses found matching &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredBusinesses.map((b) => {
              const isChosen = b.id === selectedBizId;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBizId(b.id)}
                  style={{
                    background: isChosen ? "#ffffff" : "transparent",
                    border: isChosen ? "1.5px solid var(--coral)" : "1px solid transparent",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isChosen ? "var(--coral-soft)" : "#ffffff",
                      color: isChosen ? "var(--coral-dark)" : "var(--muted)",
                      border: "1px solid var(--line)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: 13,
                    }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{b.name}</strong>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{b.categoryLabel}</span>
                    </div>
                  </div>
                  {isChosen && (
                    <span style={{ color: "var(--coral-dark)", fontWeight: 700, fontSize: 12 }}>
                      ✓ Chosen
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Step 2: Host details */}
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label htmlFor="hostName" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--ink)" }}>
            2. Your Name (Cart Host)
          </label>
          <input
            id="hostName"
            name="hostName"
            required
            defaultValue={defaultHostName}
            placeholder="e.g. Alex"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 14 }}
          />
        </div>

        <div>
          <label htmlFor="hostEmail" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--ink)" }}>
            Your Email (For order receipts and escrow delivery PIN)
          </label>
          <input
            id="hostEmail"
            name="hostEmail"
            type="email"
            required
            defaultValue={defaultHostEmail}
            placeholder="e.g. alex@gmail.com"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 14 }}
          />
        </div>
      </div>

      {/* Step 3: Split Kind */}
      <div>
        <label htmlFor="splitKind" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--ink)" }}>
          3. How do you want to split?
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            onClick={() => setSplitKind("itemized")}
            style={{
              border: splitKind === "itemized" ? "2px solid var(--coral)" : "1px solid var(--line)",
              background: splitKind === "itemized" ? "var(--coral-soft)" : "#ffffff",
              padding: "12px",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>Itemized Split</strong>
            <small style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 2 }}>
              Each person only pays for what they add to the cart.
            </small>
          </div>

          <div
            onClick={() => setSplitKind("equal")}
            style={{
              border: splitKind === "equal" ? "2px solid var(--coral)" : "1px solid var(--line)",
              background: splitKind === "equal" ? "var(--coral-soft)" : "#ffffff",
              padding: "12px",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>Equal Split</strong>
            <small style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 2 }}>
              Total bill is divided evenly among participants.
            </small>
          </div>
        </div>
        <input type="hidden" name="splitKind" value={splitKind} />
      </div>

      {/* Step 4: Submit Button */}
      <div style={{ marginTop: 6 }}>
        <button
          className="primary-button"
          type="submit"
          disabled={!selectedBizId || businesses.length === 0}
          style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 800, justifyContent: "center" }}
        >
          Create Shared Cart for {selectedBiz?.name || "Store"} →
        </button>
      </div>
    </form>
  );
}
