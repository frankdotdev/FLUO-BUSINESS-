"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen" aria-hidden="true">
      <div className="splash-brand">
        Fluo<span className="splash-dot" />
      </div>
      <div className="splash-loader">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
