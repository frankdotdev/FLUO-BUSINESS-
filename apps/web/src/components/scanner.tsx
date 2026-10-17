"use client";
import { useEffect, useRef, useState } from "react";

// Camera ticket scanner for the check-in form. Uses the browser's BarcodeDetector where it exists (Chrome on Android and desktop);
// everywhere else, the staff member pastes or types the code into the box below.
export function Scanner({ inputId }: { inputId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!on) return;
    let stop = false; let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        const detector = new (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ["qr_code"] });
        while (!stop && video.current) {
          const found = await detector.detect(video.current).catch(() => []);
          if (found[0]) {
            const input = document.getElementById(inputId) as HTMLInputElement | null;
            if (input) { input.value = found[0].rawValue; input.form?.requestSubmit(); }
            setOn(false); return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch { setNote("Camera unavailable. Type or paste the code instead."); setOn(false); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [on, inputId]);

  if (!supported) return <p className="small muted">Camera scanning isn't available in this browser. Type or paste the ticket code below.</p>;
  return (<div>{on ? <video ref={video} muted playsInline style={{ width: "100%", maxWidth: 360, borderRadius: 10 }} /> : null}
    <p><button type="button" className="btn" onClick={() => { setNote(null); setOn(!on); }}>{on ? "Stop camera" : "Scan with camera"}</button></p>{note && <p className="small">{note}</p>}</div>);
}
