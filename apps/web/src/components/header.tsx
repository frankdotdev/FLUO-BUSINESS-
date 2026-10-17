import Link from "next/link";
import { IconMapPin, IconChevronDown, IconBell, IconStore } from "./icons.tsx";

interface HeaderProps {
  user?: { name: string; email: string } | null;
  businessCount?: number;
  unreadCount?: number;
}

export function Header({ user, businessCount = 0, unreadCount = 0 }: HeaderProps) {
  return (
    <header className="fluo-top-bar" role="banner">
      <div className="brand-wrap">
        <Link href="/" className="brand-title" aria-label="Fluo Home">
          <span>Fluo</span>
          <span className="brand-dot" />
        </Link>

        {/* Location Selector Pill */}
        <div className="location-pill" title="Current location: Main Campus">
          <IconMapPin size={13} style={{ color: "var(--coral)" }} />
          <span>Campus</span>
          <IconChevronDown size={13} style={{ color: "var(--muted)" }} />
        </div>
      </div>

      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        {/* Desktop-only quick links */}
        <div className="desktop-links">
          <Link href="/search" className="btn btn-subtle" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/account/orders" className="btn btn-subtle" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>
                Orders
              </Link>
              <Link href="/app" className="btn btn-subtle" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>
                Workspaces
              </Link>
            </>
          ) : (
            <Link href="/app/new" className="badge coral" style={{ padding: "6px 12px", fontWeight: 600, fontSize: 12 }}>
              30-Day Free Trial
            </Link>
          )}
        </div>

        {businessCount > 0 && (
          <Link
            href="/app"
            className="badge coral"
            style={{ padding: "6px 10px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}
            title="Switch to Business Workspaces"
          >
            <IconStore size={14} />
            <span className="screen-only">Workspaces</span>
          </Link>
        )}

        <Link
          href="/account/messages"
          className="notif-btn"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <IconBell size={18} />
          {unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </Link>

        {!user ? (
          <Link href="/sign-in" className="btn btn-subtle" style={{ minHeight: 36, padding: "0 12px", fontSize: 13 }}>
            Sign In
          </Link>
        ) : (
          <Link href="/account" aria-label="My Account" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              {user.name ? user.name[0]?.toUpperCase() : "U"}
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
