import type { Metadata, Viewport } from "next";
import { getSession } from "@/server/session.ts";
import { deps } from "@/server/container.ts";
import { Header } from "@/components/header.tsx";
import { BottomNav } from "@/components/bottom-nav.tsx";
import { SplashScreen } from "@/components/splash-screen.tsx";
import { InstallPrompt } from "@/components/install-prompt.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fluo: discover, buy, book, attend", template: "%s | Fluo" },
  description: "Your campus, all in one place. Local businesses, bookings, rides and events, open to everyone.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fluo",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
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
      </head>
      <body>
        <SplashScreen />
        <div className="wrap">
          <Header
            user={session?.user}
            businessCount={businessCount}
            unreadCount={unreadCount}
          />
          <InstallPrompt />
          <main id="main-content">{children}</main>
          <footer className="muted small screen-only" style={{ padding: "32px 0 24px", textAlign: "center", borderTop: "1px solid var(--border-subtle)", marginTop: "40px" }}>
            Fluo &middot; Built for campus, open to everyone &middot; 30-Day Free Trial for Businesses
          </footer>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
