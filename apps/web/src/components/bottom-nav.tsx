"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  // Hide on specialized full-screen routes like Kiosk
  if (pathname.includes("/kiosk")) return null;

  return (
    <>
      <nav className="mobile-nav" aria-label="Main navigation">
        <Link
          href="/"
          className={`nav-item ${pathname === "/" ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 10 9-7 9 7v10H3z" />
            <path d="M9 20v-6h6v6" />
          </svg>
          <span>Home</span>
        </Link>

        <Link
          href="/search?filter=favorites"
          className={`nav-item ${pathname.includes("favorites") ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />
          </svg>
          <span>Saved</span>
        </Link>

        <button
          type="button"
          className="nav-item create-nav"
          id="createButton"
          aria-label="Create new order or business"
          onClick={() => setModalOpen(true)}
        >
          <span>+</span>
        </button>

        <Link
          href="/account/orders"
          className={`nav-item ${pathname.startsWith("/account/orders") ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h16v16H4z" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
          <span>Orders</span>
        </Link>

        <Link
          href="/account"
          className={`nav-item ${pathname.startsWith("/account") && !pathname.includes("/orders") ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <span>Profile</span>
        </Link>
      </nav>

      {/* Account / Action Modal matching reference design */}
      {modalOpen && (
        <div
          className="modal-backdrop open"
          id="accountModal"
          onClick={() => setModalOpen(false)}
        >
          <section
            className="modal account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accountTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-handle"></div>
            <button
              type="button"
              className="close-modal account-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="brand modal-brand">
              <span className="brand-mark">f</span>
              <span>fluo</span>
              <i></i>
            </div>
            <span className="section-kicker">ONE ACCOUNT. MORE POSSIBILITIES.</span>
            <h2 id="accountTitle">Make everyday work better.</h2>
            <p className="modal-copy">
              Join your community on Fluo &mdash; order together, discover shops, or launch your business.
            </p>

            <div className="account-actions">
              <Link
                href="/cart/new"
                onClick={() => setModalOpen(false)}
                className="account-choice"
              >
                <span className="choice-icon customer-choice">&nearr;</span>
                <span>
                  <b>Start a Group Cart</b>
                  <small>Order together with friends and split the bill automatically.</small>
                </span>
                <span className="choice-arrow">&rarr;</span>
              </Link>

              <Link
                href="/search?q=keke"
                onClick={() => setModalOpen(false)}
                className="account-choice"
              >
                <span className="choice-icon customer-choice">&nearr;</span>
                <span>
                  <b>Request a Ride or Dispatch</b>
                  <small>Propose your fare and connect with keke and dispatch riders.</small>
                </span>
                <span className="choice-arrow">&rarr;</span>
              </Link>

              <Link
                href="/app/new"
                onClick={() => setModalOpen(false)}
                className="account-choice"
              >
                <span className="choice-icon business-choice">&#9638;</span>
                <span>
                  <b>I run a business &middot; 30-Day Free Trial</b>
                  <small>Manage sales, orders, bookings, POS counter, and direct bank payouts.</small>
                </span>
                <span className="choice-arrow">&rarr;</span>
              </Link>
            </div>

            <p className="account-foot">
              Already have an account?{" "}
              <Link href="/sign-in" onClick={() => setModalOpen(false)}>
                Log in
              </Link>
            </p>
          </section>
        </div>
      )}
    </>
  );
}
