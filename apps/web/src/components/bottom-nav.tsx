"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconHeart,
  IconPlus,
  IconMessageSquare,
  IconUser,
  IconUsers,
  IconCar,
  IconStore,
  IconQrCode,
  IconX
} from "./icons.tsx";

export function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Hide bottom nav on full-screen Kiosk or specialized print/checkout views if needed
  if (pathname.includes("/kiosk")) return null;

  return (
    <>
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <Link
          href="/"
          className={`bottom-nav-item ${pathname === "/" ? "active" : ""}`}
        >
          <IconHome size={22} />
          <span>Home</span>
        </Link>

        <Link
          href="/search?filter=favorites"
          className={`bottom-nav-item ${pathname.includes("favorites") ? "active" : ""}`}
        >
          <IconHeart size={22} />
          <span>Regulars</span>
        </Link>

        {/* Center Floating Coral Action Button */}
        <button
          type="button"
          className="bottom-nav-action-btn"
          onClick={() => setSheetOpen(true)}
          aria-label="Quick Actions"
        >
          <IconPlus size={24} />
        </button>

        <Link
          href="/account/messages"
          className={`bottom-nav-item ${pathname.includes("/messages") ? "active" : ""}`}
        >
          <IconMessageSquare size={22} />
          <span>Chats</span>
        </Link>

        <Link
          href="/account"
          className={`bottom-nav-item ${pathname.startsWith("/account") && !pathname.includes("/messages") ? "active" : ""}`}
        >
          <IconUser size={22} />
          <span>Profile</span>
        </Link>
      </nav>

      {/* Quick Action Bottom Sheet */}
      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Quick Actions</h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close"
              >
                <IconX size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link
                href="/cart/new"
                onClick={() => setSheetOpen(false)}
                className="category-tile"
                style={{ flexDirection: "row", justifyContent: "flex-start", padding: "14px 16px", gap: 14 }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--coral-subtle)", color: "var(--coral)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconUsers size={20} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Start a Group Cart</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Split bills and order together with friends</div>
                </div>
              </Link>

              <Link
                href="/search?q=keke"
                onClick={() => setSheetOpen(false)}
                className="category-tile"
                style={{ flexDirection: "row", justifyContent: "flex-start", padding: "14px 16px", gap: 14 }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconCar size={20} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Request a Ride or Dispatch</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Propose your fare and negotiate with riders</div>
                </div>
              </Link>

              <Link
                href="/app/new"
                onClick={() => setSheetOpen(false)}
                className="category-tile"
                style={{ flexDirection: "row", justifyContent: "flex-start", padding: "14px 16px", gap: 14 }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconStore size={20} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Open a Business on Fluo</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>30-day Free Trial for new merchants</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
