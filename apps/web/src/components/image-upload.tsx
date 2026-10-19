"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Target = { kind: "product"; id: string } | { kind: "event"; id: string } | { kind: "business" };
const PURPOSE = { product: "product", event: "event_cover", business: "logo" } as const;
const MAX = { product: 10, event_cover: 10, logo: 5 } as const;

export function ImageUpload({
  businessId,
  target,
  label = "Add photo",
}: {
  businessId: string;
  target: Target;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "busy" | "error" | "done"; text?: string }>({ kind: "idle" });
  const purpose = PURPOSE[target.kind];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setState({ kind: "error", text: "Please choose a JPEG, PNG or WebP photo." });
    }
    if (file.size > MAX[purpose] * 1024 * 1024) {
      return setState({ kind: "error", text: `Please choose a photo under ${MAX[purpose]} MB.` });
    }

    setState({ kind: "busy", text: "Uploading photo..." });

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("businessId", businessId);
      fd.append("purpose", purpose);
      fd.append("target", JSON.stringify(target));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return setState({ kind: "error", text: data.error || "The upload didn't go through. Please try again." });
      }

      setState({ kind: "done", text: "Photo saved." });
      router.refresh();
    } catch {
      setState({ kind: "error", text: "Something went wrong. Please try again." });
    }
  }

  return (
    <span>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFile}
        hidden
        aria-label={label}
      />
      <button
        type="button"
        className="btn"
        disabled={state.kind === "busy"}
        onClick={() => input.current?.click()}
        style={{ cursor: state.kind === "busy" ? "not-allowed" : "pointer" }}
      >
        {state.kind === "busy" ? "Saving photo..." : label}
      </button>
      {state.text && (
        <span
          role="status"
          className={`small ${state.kind === "error" ? "" : "muted"}`}
          style={state.kind === "error" ? { color: "var(--error)", marginLeft: 8 } : { marginLeft: 8 }}
        >
          {state.text}
        </span>
      )}
    </span>
  );
}
