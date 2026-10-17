import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getSession } from "@/server/session.ts";
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
  themeColor: "#0b0b0b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <div className="wrap">
          <nav className="nav" aria-label="Main">
            <Link href="/" className="brand">Fluo</Link>
            <div className="row">
              {session ? (<><Link href="/app">My workspaces</Link><Link href="/account/orders">My orders</Link><Link href="/account/messages">Messages</Link></>) : (<><Link href="/sign-in">Sign in</Link><Link href="/sign-up" className="btn btn-primary">Get started</Link></>)}
            </div>
          </nav>
          <InstallPrompt />
          <form action="/search" method="get" role="search" style={{ padding: "8px 0" }}><input name="q" type="search" placeholder="Search businesses, items, events" aria-label="Search" maxLength={60} /></form>
          <main>{children}</main>
          <footer className="muted small" style={{ padding: "32px 0" }}>Fluo. Built for campus, open to everyone.</footer>
        </div>
      </body>
    </html>
  );
}

