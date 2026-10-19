"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Only show on first visit in the session
    const shown = typeof window !== "undefined" ? sessionStorage.getItem("fluo_splash_shown") : null;
    if (shown) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("fluo_splash_shown", "1");
      }
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="splash-screen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
      aria-hidden="true"
    >
      <img
        src="/logo.png"
        alt="Fluo"
        width={226}
        height={138}
        priority-load="true"
        style={{
          width: 180,
          height: "auto",
          objectFit: "contain",
        }}
      />
      <div className="splash-loader" style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f06a58", opacity: 0.8 }} />
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f06a58", opacity: 0.5 }} />
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f06a58", opacity: 0.3 }} />
      </div>
    </div>
  );
}
