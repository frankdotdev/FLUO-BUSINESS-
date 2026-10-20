"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconShare,
  IconCopy,
  IconDownload,
  IconWhatsApp,
  IconTwitterX,
  IconSend,
  IconFacebook,
  IconInstagram,
  IconShield,
  IconCheck,
  IconQrCode,
} from "./icons.tsx";

export interface ShareModalProps {
  title: string;
  subtitle?: string;
  description?: string;
  path?: string;
  url?: string;
  imageUrl?: string;
  price?: string;
  badge?: string;
  businessName?: string;
  category?: string;
  type?: "business" | "product" | "service" | "event" | "booking";
  variant?: "button" | "icon" | "compact";
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ShareModal({
  title,
  subtitle,
  description,
  path,
  url,
  imageUrl,
  price,
  badge = "Verified on Fluo",
  businessName,
  category,
  type = "product",
  variant = "button",
  label = "Share",
  className,
  style,
}: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [fullUrl, setFullUrl] = useState(url || "");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const calculated = url || (path ? `${window.location.origin}${path}` : window.location.href);
      setFullUrl(calculated);
      if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
        try {
          const testFile = new File([""], "test.png", { type: "image/png" });
          setCanShareFiles(navigator.canShare({ files: [testFile] }));
        } catch {
          setCanShareFiles(false);
        }
      }
    }
  }, [url, path]);

  // Generate QR code for instant scanning
  useEffect(() => {
    if (isOpen && fullUrl && !qrDataUrl) {
      import("qrcode")
        .then((QRCode) => {
          QRCode.toDataURL(fullUrl, {
            margin: 2,
            width: 320,
            errorCorrectionLevel: "M",
            color: { dark: "#172126", light: "#ffffff" },
          })
            .then(setQrDataUrl)
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [isOpen, fullUrl, qrDataUrl]);

  const shareText = `Check out ${title}${price ? ` (${price})` : ""}${businessName ? ` from ${businessName}` : ""} on Fluo! 🛡️ 100% Escrow Protected:`;

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement("input");
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: fullUrl,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  // Generate high-resolution branded PNG on client-side canvas
  const generateCardBlob = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = "#12181b";
    ctx.fillRect(0, 0, 1200, 630);

    // Decorative gradient circles
    ctx.fillStyle = "rgba(240, 120, 102, 0.14)";
    ctx.beginPath();
    ctx.arc(1100, 100, 280, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(33, 134, 106, 0.10)";
    ctx.beginPath();
    ctx.arc(100, 540, 260, 0, Math.PI * 2);
    ctx.fill();

    // Container card
    ctx.fillStyle = "#172126";
    ctx.strokeStyle = "#27343a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(36, 36, 1128, 558, 28);
    ctx.fill();
    ctx.stroke();

    // Fluo Brand Logo Header
    ctx.fillStyle = "#f07866";
    ctx.beginPath();
    ctx.arc(90, 96, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("FLUO", 112, 106);

    // Escrow Protection Badge - Big & clear
    ctx.fillStyle = "#1b2f27";
    ctx.strokeStyle = "#2d5243";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(220, 74, 255, 44, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#4ade80";
    ctx.font = "800 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("🛡️ Fluo Escrow Protected", 244, 102);

    // Category / Verified Pill
    if (badge) {
      ctx.fillStyle = "#222e34";
      ctx.strokeStyle = "#2e3f47";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(490, 74, 200, 44, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#b0c0c7";
      ctx.font = "700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(`✓ ${badge.slice(0, 20)}`, 512, 102);
    }

    // Category Kicker
    const catText = category || (type === "product" ? "PRODUCT" : type === "service" ? "SERVICE" : type === "event" ? "EVENT" : "LOCAL BUSINESS");
    ctx.fillStyle = "#f07866";
    ctx.font = "800 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(catText.toUpperCase(), 76, 185);

    // Title text
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const words = title.split(" ");
    let line = "";
    let y = 245;
    const maxTextWidth = imageUrl ? 620 : 960;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && i > 0) {
        ctx.fillText(line.trim(), 76, y);
        line = words[i] + " ";
        y += 56;
        if (y > 310) {
          line += "...";
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 76, y);

    // Subtitle / Business Name
    ctx.fillStyle = "#9db0b7";
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const sub = subtitle || (businessName ? `Available from ${businessName}` : description || "Discover and order securely on Fluo");
    ctx.fillText(sub.slice(0, 60), 76, y + 46);

    // Price Card (if applicable)
    if (price) {
      const priceY = y + 78;
      ctx.fillStyle = "#261b1a";
      ctx.strokeStyle = "#7a372d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(76, priceY, 280, 72, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f07866";
      ctx.font = "900 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(price, 106, priceY + 49);
    }

    // Right Photo or Fluo Emblem (Loaded safely via proxy or object URL to avoid CORS taint)
    if (imageUrl) {
      let objectUrl: string | null = null;
      try {
        const proxyUrl = imageUrl.startsWith("data:") || imageUrl.startsWith("/")
          ? imageUrl
          : `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Image proxy failed");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = objectUrl!;
        });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(730, 110, 380, 380, 26);
        ctx.clip();

        // Fit cover calculation
        const hRatio = 380 / img.width;
        const vRatio = 380 / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (380 - img.width * ratio) / 2;
        const centerShiftY = (380 - img.height * ratio) / 2;
        ctx.drawImage(img, 730 + centerShiftX, 110 + centerShiftY, img.width * ratio, img.height * ratio);
        ctx.restore();

        // Photo border
        ctx.strokeStyle = "#2d3c43";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(730, 110, 380, 380, 26);
        ctx.stroke();
      } catch {
        drawEmblem(ctx);
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    } else {
      drawEmblem(ctx);
    }

    // Bottom Footer Bar
    ctx.strokeStyle = "#25343a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(76, 510);
    ctx.lineTo(1124, 510);
    ctx.stroke();

    ctx.fillStyle = "#8899a0";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("100% Escrow delivery & verified orders on", 76, 554);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("fluo-business.vercel.app", 490, 554);

    // CTA Button Pill
    ctx.fillStyle = "#f07866";
    ctx.beginPath();
    ctx.roundRect(930, 524, 180, 46, 14);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("View on Fluo ↗", 955, 554);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const drawEmblem = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#1b2428";
    ctx.strokeStyle = "#28353b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(730, 110, 380, 380, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(240, 120, 102, 0.15)";
    ctx.beginPath();
    ctx.arc(920, 270, 85, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(240, 120, 102, 0.35)";
    ctx.beginPath();
    ctx.arc(920, 270, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f07866";
    ctx.font = "900 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FLUO", 920, 284);

    ctx.fillStyle = "#8d9ea5";
    ctx.font = "700 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Nigeria's Commerce Network", 920, 380);
    ctx.textAlign = "left";
  };

  const handleDownloadImage = async () => {
    try {
      setGenerating(true);
      const blob = await generateCardBlob();
      if (!blob) return;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      link.download = `fluo-${cleanSlug}-card.png`;
      link.href = downloadUrl;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error("Error exporting image", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    link.download = `fluo-${cleanSlug}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleShareImageFile = async () => {
    try {
      setGenerating(true);
      const blob = await generateCardBlob();
      if (!blob) return;
      const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      const file = new File([blob], `fluo-${cleanSlug}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: shareText,
        });
      } else {
        handleDownloadImage();
      }
    } catch {
      handleDownloadImage();
    } finally {
      setGenerating(false);
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`;

  const modalContent = isOpen && (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18, 24, 27, 0.76)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 24,
          border: "1px solid var(--line)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
          width: "100%",
          maxWidth: 580,
          padding: "clamp(20px, 4vw, 28px)",
          position: "relative",
          display: "grid",
          gap: 18,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <span className="section-kicker" style={{ margin: 0 }}>SOCIAL &amp; MESSAGING</span>
            <h2 id="share-title" style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 0", color: "var(--ink)" }}>
              Share {type === "business" ? "Business" : type === "event" ? "Event" : "Product or Service"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            style={{
              border: 0,
              background: "var(--canvas)",
              width: 34,
              height: 34,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 16,
              color: "var(--ink)",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab switch: Social Graphic Card vs Storefront QR Code */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          <button
            type="button"
            onClick={() => setShowQr(false)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: 0,
              background: !showQr ? "var(--coral)" : "var(--canvas)",
              color: !showQr ? "#ffffff" : "var(--ink)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Visual Social Card
          </button>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: 0,
              background: showQr ? "var(--coral)" : "var(--canvas)",
              color: showQr ? "#ffffff" : "var(--ink)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
          >
            <IconQrCode size={14} /> Scan / Storefront QR
          </button>
        </div>

        {!showQr ? (
          <>
            {/* Live Branded Social Preview Card */}
            <div
              style={{
                background: "#12181b",
                borderRadius: 20,
                padding: "20px",
                border: "1px solid #263339",
                color: "#ffffff",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                display: "grid",
                gap: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Card Header Strip */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--coral)" }} />
                  <strong style={{ fontSize: 13, letterSpacing: "-0.02em", color: "#ffffff" }}>FLUO</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#4ade80",
                      background: "#1b2f27",
                      border: "1px solid #2d5243",
                      padding: "3px 8px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <IconShield size={11} /> Escrow Protected
                  </span>
                  {badge && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#a4b3b9",
                        background: "#212d33",
                        border: "1px solid #2e3d45",
                        padding: "3px 8px",
                        borderRadius: 12,
                      }}
                    >
                      ✓ {badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 16,
                      objectFit: "cover",
                      border: "1px solid #2e3d45",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 16,
                      background: "#1e282d",
                      border: "1px solid #2a3940",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--coral)",
                      fontSize: 28,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  {category && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--coral)", letterSpacing: "1px", textTransform: "uppercase" }}>
                      {category}
                    </span>
                  )}
                  <h3 style={{ margin: "2px 0 4px", fontSize: 16, fontWeight: 800, color: "#ffffff", lineHeight: 1.3 }}>
                    {title}
                  </h3>
                  {subtitle && (
                    <p style={{ margin: 0, fontSize: 11, color: "#95a5ac", lineHeight: 1.4 }}>
                      {subtitle}
                    </p>
                  )}
                  {price && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        display: "inline-block",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--coral)",
                        background: "#281c1a",
                        border: "1px solid #6b352c",
                        padding: "3px 9px",
                        borderRadius: 8,
                      }}>
                        {price}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 10,
                borderTop: "1px solid #222e34",
                fontSize: 10,
                color: "#75868e",
              }}>
                <span>fluo-business.vercel.app</span>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>Tap or scan to view ↗</span>
              </div>
            </div>

            {/* Quick Share Platforms Row With Official Colors & SVGs */}
            <div>
              <span className="section-kicker" style={{ margin: "0 0 10px", display: "block" }}>
                SHARE DIRECTLY TO SOCIAL MEDIA
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))", gap: 10 }}>
                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#25D366",
                    color: "#ffffff",
                    borderColor: "#25D366",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
                  }}
                >
                  <IconWhatsApp size={16} /> WhatsApp
                </a>

                {/* Twitter / X */}
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#000000",
                    color: "#ffffff",
                    borderColor: "#000000",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <IconTwitterX size={14} /> X / Twitter
                </a>

                {/* Telegram */}
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#229ED9",
                    color: "#ffffff",
                    borderColor: "#229ED9",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: "0 2px 6px rgba(34, 158, 217, 0.25)",
                  }}
                >
                  <IconSend size={15} /> Telegram
                </a>

                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#1877F2",
                    color: "#ffffff",
                    borderColor: "#1877F2",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: "0 2px 6px rgba(24, 119, 242, 0.25)",
                  }}
                >
                  <IconFacebook size={15} /> Facebook
                </a>
              </div>
            </div>

            {/* Branded Image Content Creation Actions */}
            <div style={{ background: "var(--canvas)", padding: "14px 16px", borderRadius: 16, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 13, color: "var(--ink)" }}>Story &amp; Status Image Content</strong>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>1200×630 High-Resolution PNG</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                Export the branded graphic card above with escrow protection, price, and merchant logo to post on WhatsApp Status or Instagram Stories.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={generating}
                  className="primary-button"
                  style={{ fontSize: 12, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconDownload size={14} /> {generating ? "Generating..." : "Download Social Card Image"}
                </button>
                {canShareFiles && (
                  <button
                    type="button"
                    onClick={handleShareImageFile}
                    disabled={generating}
                    className="secondary-button"
                    style={{ fontSize: 12, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <IconInstagram size={14} /> Share as Image Card
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Storefront QR Code Tab */
          <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
            <div style={{
              background: "#ffffff",
              padding: 16,
              borderRadius: 20,
              display: "inline-block",
              border: "1px solid var(--line)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              marginBottom: 14,
            }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Storefront QR Code" style={{ width: 220, height: 220, display: "block" }} />
              ) : (
                <div style={{ width: 220, height: 220, display: "grid", placeItems: "center", color: "var(--muted)" }}>
                  Generating QR Code...
                </div>
              )}
            </div>
            <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>Scan to Open Storefront</h4>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted)", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
              Print or display this QR code at your shop, stall, or event venue. Customers can scan directly with their phone camera to order with zero hassle.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
                className="primary-button"
                style={{ fontSize: 13, padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <IconDownload size={14} /> Download QR Code PNG
              </button>
            </div>
          </div>
        )}

        {/* Copy Link Strip */}
        <div style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "var(--canvas)",
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid var(--line)",
        }}>
          <input
            type="text"
            readOnly
            value={fullUrl}
            style={{
              flex: 1,
              border: 0,
              background: "transparent",
              fontSize: 12,
              color: "var(--ink)",
              outline: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          />
          <button
            type="button"
            onClick={copyToClipboard}
            className="secondary-button"
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: copied ? "#edf6f0" : "#ffffff",
              color: copied ? "var(--green)" : "var(--ink)",
              borderColor: copied ? "#bfe3cc" : "var(--line)",
            }}
          >
            {copied ? (
              <>
                <IconCheck size={13} /> Copied!
              </>
            ) : (
              <>
                <IconCopy size={13} /> Copy Link
              </>
            )}
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="primary-button"
              style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700 }}
            >
              Share ↗
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`icon-btn ${className || ""}`}
          aria-label={label}
          title={label}
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            cursor: "pointer",
            ...style,
          }}
        >
          <IconShare size={16} />
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`btn btn-subtle ${className || ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            ...style,
          }}
        >
          <IconShare size={14} /> {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`secondary-button ${className || ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: "#ffffff",
            ...style,
          }}
        >
          <IconShare size={15} /> {label}
        </button>
      )}

      {/* Hidden canvas for client-side card rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Portaled Modal Backdrop & Dialog (Directly into document.body to avoid parent transforms/clipping) */}
      {isOpen && mounted && typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
    </>
  );
}
