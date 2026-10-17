"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeUploadAction, requestUploadAction } from "@/app/actions.ts";

type Target = { kind: "product"; id: string } | { kind: "event"; id: string } | { kind: "business" };
const PURPOSE = { product: "product", event: "event_cover", business: "logo" } as const;
const MAX = { product: 10, event_cover: 10, logo: 5 } as const;

/** Photo picker. The browser sends the file straight to storage with a short-lived signed link; the server then checks the real file,
 *  resizes it and attaches it. Large originals never pass through the app server. */
export function ImageUpload({ businessId, target, label = "Add photo" }: { businessId: string; target: Target; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "busy" | "error" | "done"; text?: string }>({ kind: "idle" });
  const purpose = PURPOSE[target.kind];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setState({ kind: "error", text: "Please choose a JPEG, PNG or WebP photo." });
    if (file.size > MAX[purpose] * 1024 * 1024) return setState({ kind: "error", text: `Please choose a photo under ${MAX[purpose]} MB.` });
    setState({ kind: "busy", text: "Uploading..." });
    try {
      const intent = await requestUploadAction({ businessId, purpose, contentType: file.type, bytes: file.size });
      if (!intent.ok) return setState({ kind: "error", text: intent.error });
      const put = await fetch(intent.url, { method: "PUT", headers: intent.headers, body: file });
      if (!put.ok) return setState({ kind: "error", text: "The upload didn't go through. Please try again." });
      setState({ kind: "busy", text: "Preparing your photo..." });
      const done = await completeUploadAction({ businessId, assetId: intent.assetId, target });
      if (!done.ok) return setState({ kind: "error", text: done.error });
      setState({ kind: "done", text: "Photo saved." }); router.refresh();
    } catch { setState({ kind: "error", text: "Something went wrong. Please try again." }); }
  }
  return (
    <span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} hidden aria-label={label} />
      <button type="button" className="btn" disabled={state.kind === "busy"} onClick={() => input.current?.click()}>{state.kind === "busy" ? "Please wait..." : label}</button>
      {state.text && <span role="status" className={`small ${state.kind === "error" ? "" : "muted"}`} style={state.kind === "error" ? { color: "var(--error)", marginLeft: 8 } : { marginLeft: 8 }}>{state.text}</span>}
    </span>
  );
}
