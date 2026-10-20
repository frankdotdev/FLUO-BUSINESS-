// Dynamic Open Graph Social Share Image Generator for Fluo
// Generates high-resolution 1200x630 branded preview cards optimized for WhatsApp, Twitter/X, Telegram, and Facebook.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Fluo Marketplace").slice(0, 60);
  const subtitle = (searchParams.get("subtitle") || "Commerce, Connected • Escrow Protected").slice(0, 80);
  const price = searchParams.get("price") || "";
  const badge = (searchParams.get("badge") || "Verified on Fluo").slice(0, 35);
  const category = (searchParams.get("category") || "").slice(0, 25);
  const imageUrl = searchParams.get("image") || "";

  const escapeXml = (s: string) =>
    s.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });

  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safePrice = escapeXml(price);
  const safeBadge = escapeXml(badge);
  const safeCategory = escapeXml(category);

  // Split title if long (> 24 chars for extra bold readability on small previews)
  let titleLine1 = safeTitle;
  let titleLine2 = "";
  if (safeTitle.length > 24) {
    const spaceIdx = safeTitle.lastIndexOf(" ", 24);
    if (spaceIdx > 8) {
      titleLine1 = safeTitle.slice(0, spaceIdx);
      titleLine2 = safeTitle.slice(spaceIdx + 1);
    }
  }

  // Attempt to fetch product/business image server-side for Sharp compositing
  let fetchedImageBuffer: Buffer | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        fetchedImageBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // Fallback to stylized Fluo monogram emblem
    }
  }

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Deep Midnight Ink Background -->
  <rect width="1200" height="630" fill="#12181b" />

  <!-- Atmospheric Coral & Emerald Ambient Accents -->
  <circle cx="1120" cy="110" r="300" fill="#f07866" opacity="0.14" />
  <circle cx="120" cy="560" r="280" fill="#21866a" opacity="0.10" />

  <!-- Inner Elevated Premium Card Frame -->
  <rect x="36" y="36" width="1128" height="558" rx="28" fill="#172126" stroke="#263339" stroke-width="2.5" />

  <!-- Top Brand & Protection Header Strip -->
  <g transform="translate(76, 76)">
    <!-- Brand Mark & Logo -->
    <circle cx="14" cy="20" r="10" fill="#f07866" />
    <text x="34" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="-0.03em">FLUO</text>

    <!-- Escrow Protection Badge - Big & Legible on mobile -->
    <rect x="145" y="0" width="260" height="44" rx="22" fill="#1b2f27" stroke="#2d5243" stroke-width="2" />
    <text x="275" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#4ade80" text-anchor="middle">🛡️ Fluo Escrow Protected</text>

    <!-- Category / Verified Badge -->
    ${
      safeBadge
        ? `<rect x="420" y="0" width="200" height="44" rx="22" fill="#212d33" stroke="#2e3f47" stroke-width="2" />
           <text x="520" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#b0c0c7" text-anchor="middle">✓ ${safeBadge}</text>`
        : ""
    }
  </g>

  <!-- Left Main Content Block -->
  <g transform="translate(76, 160)">
    ${
      safeCategory
        ? `<text x="0" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#f07866" letter-spacing="1.5px">${safeCategory.toUpperCase()}</text>`
        : ""
    }

    <!-- Item / Business Big Bold Title -->
    <text x="0" y="${safeCategory ? 82 : 56}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-0.04em">
      ${titleLine1}
    </text>
    ${
      titleLine2
        ? `<text x="0" y="${safeCategory ? 142 : 116}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-0.04em">
             ${titleLine2}
           </text>`
        : ""
    }

    <!-- Subtitle / Merchant Name -->
    <text x="0" y="${titleLine2 ? 195 : 128}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#9db0b7">
      ${safeSubtitle}
    </text>

    <!-- Large Punchy Price Box -->
    ${
      safePrice
        ? `<g transform="translate(0, ${titleLine2 ? 230 : 160})">
             <rect x="0" y="0" width="280" height="70" rx="18" fill="#261b1a" stroke="#7a372d" stroke-width="2" />
             <text x="140" y="47" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#f07866" text-anchor="middle">
               ${safePrice}
             </text>
           </g>`
        : ""
    }
  </g>

  <!-- Right Visual Placeholder (Filled by Sharp composite if image fetched, or stylized vector emblem) -->
  ${
    !fetchedImageBuffer
      ? `
  <rect x="730" y="110" width="380" height="380" rx="26" fill="#1b2428" stroke="#28353b" stroke-width="2.5" />
  <circle cx="920" cy="270" r="85" fill="#f07866" opacity="0.15" />
  <circle cx="920" cy="270" r="50" fill="#f07866" opacity="0.35" />
  <text x="920" y="284" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="900" fill="#f07866" text-anchor="middle">FLUO</text>
  <text x="920" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#8d9ea5" text-anchor="middle">Nigeria's Commerce Network</text>
      `
      : ""
  }

  <!-- Footer Security & Order Strip -->
  <line x1="76" y1="510" x2="1124" y2="510" stroke="#25343a" stroke-width="1.5" />
  
  <text x="76" y="554" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#8899a0">
    100% Escrow delivery &amp; verified orders on <tspan fill="#ffffff" font-weight="800">fluo-business.vercel.app</tspan>
  </text>

  <rect x="930" y="524" width="180" height="46" rx="14" fill="#f07866" />
  <text x="1020" y="554" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#ffffff" text-anchor="middle">Open on Fluo →</text>
</svg>
  `.trim();

  try {
    const sharp = (await import("sharp")).default;
    let base = sharp(Buffer.from(svg));

    // If an image was fetched, composite it on the right box with rounded corners
    if (fetchedImageBuffer) {
      const roundedCornerMask = Buffer.from(
        `<svg width="380" height="380"><rect x="0" y="0" width="380" height="380" rx="26" ry="26" fill="#fff"/></svg>`
      );

      const processedImage = await sharp(fetchedImageBuffer)
        .resize(380, 380, { fit: "cover", position: "center" })
        .composite([{ input: roundedCornerMask, blend: "dest-in" }])
        .png()
        .toBuffer();

      base = base.composite([
        {
          input: processedImage,
          top: 110,
          left: 730,
        },
      ]);
    }

    const pngBuffer = await base.png().toBuffer();
    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  }
}
