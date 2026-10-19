import type { Metadata, Viewport } from "next";
import { getSession } from "@/server/session.ts";
import { deps } from "@/server/container.ts";
import { Header } from "@/components/header.tsx";
import { BottomNav } from "@/components/bottom-nav.tsx";
import { SplashScreen } from "@/components/splash-screen.tsx";
import { InstallPrompt } from "@/components/install-prompt.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fluo — Commerce, connected.", template: "%s | Fluo" },
  description: "Discover local businesses, get things done, and keep your everyday moving — all in one place.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fluo",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f06a58",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let businessCount = 0;
  let unreadCount = 0;

  if (session?.user?.id) {
    try {
      const d = deps();
      const [memberships, convs] = await Promise.all([
        d.store.membershipsForUser(session.user.id).catch(() => []),
        d.store.listConversationsForCustomer(session.user.id, 10).catch(() => []),
      ]);
      businessCount = memberships.filter((m) => m.status === "active").length;
      unreadCount = convs.reduce((sum, c) => sum + (c.customerUnread || 0), 0);
    } catch {
      // Non-blocking fallback
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SplashScreen />
        <div className="app-shell">
          <Header
            user={session?.user}
            businessCount={businessCount}
            unreadCount={unreadCount}
          />
          <InstallPrompt />
          <main id="main-content">{children}</main>
          <footer
            className="muted small screen-only"
            style={{
              padding: "36px clamp(20px, 5.5vw, 82px) 24px",
              textAlign: "center",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: "40px",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            © 2026 Fluo • Made for the way business and community work • 30-Day Free Trial for Merchants
          </footer>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
