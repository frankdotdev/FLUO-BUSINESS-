import Link from "next/link";
import { LocationPill } from "./location-pill.tsx";
import { IconHeart, IconReceipt, IconUsers, IconStore, IconMessageSquare, IconBell, IconSparkles } from "./icons.tsx";

interface HeaderProps {
  user?: { name: string; email: string } | null;
  businessCount?: number;
  unreadCount?: number;
}

export function Header({ user, businessCount = 0, unreadCount = 0 }: HeaderProps) {
  const avatarLetter = user?.name ? user.name.trim().charAt(0).toUpperCase() : "F";

  return (
    <header className="topbar" role="banner">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link className="brand" href="/" aria-label="Fluo home">
          <span className="brand-mark">f</span>
          <span>fluo</span>
          <i></i>
        </Link>

        {/* Real Dynamic Location Auto-Detection Pill */}
        <LocationPill />
      </div>

      {/* Desktop Navigation Links */}
      <nav
        className="desktop-nav"
        aria-label="Desktop primary navigation"
      >
        <Link
          href="/"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          Explore
        </Link>

        <Link
          href="/search?filter=favorites"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <IconHeart size={14} /> Saved
        </Link>

        <Link
          href="/account/orders"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <IconReceipt size={14} /> Orders
        </Link>

        <Link
          href="/account/messages"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <IconMessageSquare size={14} /> Messages
          {unreadCount > 0 && (
            <span style={{ background: "var(--coral)", color: "#ffffff", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
              {unreadCount}
            </span>
          )}
        </Link>

        <Link
          href="/cart/new"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <IconUsers size={14} /> Group Cart
        </Link>
      </nav>

      {/* Top Actions */}
      <div className="top-actions">
        {businessCount > 0 ? (
          <Link
            href="/app"
            className="secondary-button desktop-cta"
            style={{ padding: "8px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Switch to your business workspaces"
          >
            <IconStore size={14} /> Workspaces
          </Link>
        ) : (
          <Link
            href="/app/new"
            className="primary-button desktop-cta"
            style={{ padding: "8px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
            title="Open a store on Fluo with a 30-day free trial"
          >
            <IconSparkles size={13} /> Open Store • Free Trial
          </Link>
        )}

        <Link
          href="/account/messages"
          className="icon-btn notification-btn"
          aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : "Notifications"}
          title="Direct messages"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </Link>

        {user ? (
          <Link href="/account" className="avatar" aria-label="Open profile" title={user.name}>
            {avatarLetter}
          </Link>
        ) : (
          <Link href="/sign-in" className="avatar" aria-label="Sign in" title="Sign in or create account">
            F
          </Link>
        )}
      </div>
    </header>
  );
}
