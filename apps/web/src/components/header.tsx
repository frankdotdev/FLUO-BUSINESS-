import Link from "next/link";

interface HeaderProps {
  user?: { name: string; email: string } | null;
  businessCount?: number;
  unreadCount?: number;
}

export function Header({ user, businessCount = 0, unreadCount = 0 }: HeaderProps) {
  const avatarLetter = user?.name ? user.name.trim().charAt(0).toUpperCase() : "F";

  return (
    <header className="topbar" role="banner">
      <Link className="brand" href="/" aria-label="Fluo home">
        <span className="brand-mark">f</span>
        <span>fluo</span>
        <i></i>
      </Link>

      <div className="location-pill" title="Current Community: Abakaliki / Campus">
        <span className="pin-dot"></span>
        <span>Abakaliki</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </div>

      <div className="top-actions">
        {businessCount > 0 && (
          <Link
            href="/app"
            className="badge coral"
            style={{ padding: "6px 11px", fontWeight: 700, fontSize: 12, borderRadius: 10 }}
            title="Switch to Business Workspaces"
          >
            Workspaces
          </Link>
        )}

        <Link
          href="/account/messages"
          className="icon-btn notification-btn"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
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
