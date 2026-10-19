"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconUsers,
  IconCar,
  IconStore,
  IconMessageSquare,
  IconArrowRight,
  IconX,
  IconSparkles,
  IconReceipt,
  IconHeart,
} from "./icons.tsx";

export function BottomNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  // Hide on specialized full-screen routes like Kiosk
  if (pathname.includes("/kiosk")) return null;

  return (
    <>
      <nav className="mobile-nav" aria-label="Main navigation">
        <Link href="/" className={`nav-item ${pathname === "/" ? "active" : ""}`}>
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

        {/* Central Floating Action Button */}
        <button
          type="button"
          className="nav-item create-nav"
          id="createButton"
          aria-label="Create or explore quick actions"
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
          className={`nav-item ${pathname.startsWith("/account") && !pathname.includes("/orders") && !pathname.includes("/messages") ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <span>Profile</span>
        </Link>
      </nav>

      {/* Floating Action Modal */}
      {modalOpen && (
        <div className="modal-backdrop open" id="accountModal" onClick={() => setModalOpen(false)}>
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
              <IconX size={18} />
            </button>
            <div className="brand modal-brand">
              <span className="brand-mark">f</span>
              <span>fluo</span>
              <i></i>
            </div>
            <span className="section-kicker">QUICK ACTIONS • EVERYTHING CONNECTED</span>
            <h2 id="accountTitle">What would you like to do?</h2>
            <p className="modal-copy">
              Explore your community on Fluo — message sellers, pool orders, request rides, or bring your business online.
            </p>

            <div className="account-actions">
              {/* Direct Messages & Chat */}
              <Link href="/account/messages" onClick={() => setModalOpen(false)} className="account-choice">
                <span className="choice-icon customer-choice">
                  <IconMessageSquare size={18} />
                </span>
                <span>
                  <b>Messages &amp; Inquiries</b>
                  <small>Chat directly with local merchants or track your order questions.</small>
                </span>
                <span className="choice-arrow">
                  <IconArrowRight size={15} />
                </span>
              </Link>

              {/* Start Group Cart */}
              <Link href="/cart/new" onClick={() => setModalOpen(false)} className="account-choice">
                <span className="choice-icon customer-choice">
                  <IconUsers size={18} />
                </span>
                <span>
                  <b>Start a Group Cart</b>
                  <small>Order food or groceries together with friends and split the bill.</small>
                </span>
                <span className="choice-arrow">
                  <IconArrowRight size={15} />
                </span>
              </Link>

              {/* Ride / Dispatch */}
              <Link href="/search?q=keke" onClick={() => setModalOpen(false)} className="account-choice">
                <span className="choice-icon customer-choice">
                  <IconCar size={18} />
                </span>
                <span>
                  <b>Request a Ride or Dispatch</b>
                  <small>Connect with verified campus keke drivers and dispatch couriers.</small>
                </span>
                <span className="choice-arrow">
                  <IconArrowRight size={15} />
                </span>
              </Link>

              {/* Business Onboarding */}
              <Link href="/app/new" onClick={() => setModalOpen(false)} className="account-choice">
                <span className="choice-icon business-choice">
                  <IconStore size={18} />
                </span>
                <span>
                  <b>I Run a Business • 30-Day Free Trial</b>
                  <small>Launch your online store, counter POS register, and accept bank transfers.</small>
                </span>
                <span className="choice-arrow">
                  <IconArrowRight size={15} />
                </span>
              </Link>
            </div>

            <p className="account-foot">
              Already have an account?{" "}
              <Link href="/sign-in" onClick={() => setModalOpen(false)} style={{ color: "var(--coral-dark)", fontWeight: 700 }}>
                Sign in ↗
              </Link>
            </p>
          </section>
        </div>
      )}
    </>
  );
}
