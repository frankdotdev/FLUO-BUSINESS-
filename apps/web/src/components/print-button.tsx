"use client";

import { IconPrinter } from "./icons.tsx";

export function PrintButton({ label = "Print Receipt" }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      onClick={() => window.print()}
    >
      <IconPrinter size={16} /> {label}
    </button>
  );
}
