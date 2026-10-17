"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (reg.installing) console.log("Fluo PWA service worker installing");
        })
        .catch((err) => {
          console.warn("Service worker registration skipped:", err);
        });
    }

    // Check if already running as standalone installed app
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || isDismissed || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      className="card"
      style={{
        margin: "12px 0",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        background: "var(--color-surface, #f8f8f8)",
        border: "1px solid var(--color-border, #e0e0e0)",
        borderRadius: "8px",
      }}
      aria-label="Install app banner"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img src="/icon.svg" alt="" width={32} height={32} style={{ borderRadius: "6px" }} />
        <div>
          <strong style={{ fontSize: "14px", display: "block" }}>Install Fluo App</strong>
          <span className="muted small">Quick access to shops, rides and orders right from your home screen.</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleInstallClick}
          className="btn btn-primary"
          style={{ fontSize: "13px", padding: "6px 12px" }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="btn"
          style={{ fontSize: "13px", padding: "6px 10px", background: "transparent", border: 0 }}
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
