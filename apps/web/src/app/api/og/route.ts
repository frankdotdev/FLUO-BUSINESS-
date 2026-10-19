// Dynamic Open Graph Social Share Image Generator for Fluo
// Generates high-resolution 1200x630 branded preview cards for WhatsApp, Twitter/X, Telegram, Facebook, and Instagram.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Fluo Marketplace").slice(0, 65);
  const subtitle = (searchParams.get("subtitle") || "Commerce, Connected • Escrow Protected").slice(0, 95);
  const price = searchParams.get("price") || "";
  const badge = (searchParams.get("badge") || "Verified on Fluo").slice(0, 40);
  const category = (searchParams.get("category") || "").slice(0, 30);
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
  const safeImageUrl = imageUrl ? escapeXml(imageUrl) : "";

  // Split title if long (> 32 chars)
  let titleLine1 = safeTitle;
  let titleLine2 = "";
  if (safeTitle.length > 32) {
    const spaceIdx = safeTitle.lastIndexOf(" ", 32);
    if (spaceIdx > 12) {
      titleLine1 = safeTitle.slice(0, spaceIdx);
      titleLine2 = safeTitle.slice(spaceIdx + 1);
    }
  }

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="photoClip">
      <rect x="740" y="115" width="370" height="370" rx="24" />
    </clipPath>
  </defs>

  <!-- Deep Midnight Ink Background -->
  <rect width="1200" height="630" fill="#12181b" />

  <!-- Subtle Fluo Coral & Emerald Atmosphere -->
  <circle cx="1120" cy="110" r="280" fill="#f07866" opacity="0.10" />
  <circle cx="120" cy="560" r="260" fill="#21866a" opacity="0.08" />

  <!-- Inner Elevated Card -->
  <rect x="40" y="40" width="1120" height="550" rx="28" fill="#172126" stroke="#263339" stroke-width="2" />

  <!-- Top Navigation Pill Header -->
  <g transform="translate(80, 80)">
    <!-- Brand Mark & Logo -->
    <circle cx="12" cy="18" r="8" fill="#f07866" />
    <text x="30" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="-0.03em">FLUO</text>

    <!-- Escrow Protection Badge -->
    <rect x="130" y="0" width="225" height="38" rx="19" fill="#1b2f27" stroke="#2d5243" stroke-width="1.5" />
    <text x="242" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#4ade80" text-anchor="middle">🛡️ Fluo Escrow Protected</text>

    <!-- Category or Verification Badge -->
    ${
      safeBadge
        ? `<rect x="365" y="0" width="190" height="38" rx="19" fill="#212d33" stroke="#2e3d45" stroke-width="1.5" />
           <text x="460" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#a4b3b9" text-anchor="middle">✓ ${safeBadge}</text>`
        : ""
    }
  </g>

  <!-- Left Main Content -->
  <g transform="translate(80, 160)">
    ${
      safeCategory
        ? `<text x="0" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f07866" letter-spacing="1.5px">${safeCategory.toUpperCase()}</text>`
        : ""
    }

    <!-- Item / Business Name -->
    <text x="0" y="${safeCategory ? 80 : 60}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.03em">
      ${titleLine1}
    </text>
    ${
      titleLine2
        ? `<text x="0" y="${safeCategory ? 134 : 114}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.03em">
             ${titleLine2}
           </text>`
        : ""
    }

    <!-- Subtitle / Details -->
    <text x="0" y="${titleLine2 ? 180 : 120}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500" fill="#8d9ca2">
      ${safeSubtitle}
    </text>

    <!-- Price Pill If Product / Ticket -->
    ${
      safePrice
        ? `<g transform="translate(0, ${titleLine2 ? 215 : 155})">
             <rect x="0" y="0" width="240" height="60" rx="16" fill="#251b1a" stroke="#68342c" stroke-width="1.5" />
             <text x="120" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#f07866" text-anchor="middle">
               ${safePrice}
             </text>
           </g>`
        : ""
    }
  </g>

  <!-- Right Visual / Photo Showcase -->
  ${
    safeImageUrl
      ? `
  <rect x="738" y="113" width="374" height="374" rx="26" fill="#222d33" stroke="#2e3d45" stroke-width="2" />
  <image href="${safeImageUrl}" x="740" y="115" width="370" height="370" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />
  <rect x="755" y="435" width="130" height="34" rx="10" fill="rgba(18, 24, 27, 0.85)" />
  <text x="820" y="457" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Direct Seller</text>
      `
      : `
  <rect x="740" y="115" width="370" height="370" rx="26" fill="#1b2428" stroke="#28353b" stroke-width="2" />
  <circle cx="925" cy="275" r="75" fill="#f07866" opacity="0.15" />
  <circle cx="925" cy="275" r="45" fill="#f07866" opacity="0.3" />
  <text x="925" y="288" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#f07866" text-anchor="middle">FLUO</text>
  <text x="925" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#809096" text-anchor="middle">Nigeria's Commerce Network</text>
      `
  }

  <!-- Footer Link & CTA Strip -->
  <line x1="80" y1="510" x2="1120" y2="510" stroke="#243137" stroke-width="1.5" />
  
  <text x="80" y="552" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500" fill="#7d8d93">
    Safe payments &amp; escrow delivery on <tspan fill="#ffffff" font-weight="700">fluo-business.vercel.app</tspan>
  </text>

  <rect x="940" y="525" width="170" height="42" rx="12" fill="#f07866" />
  <text x="1025" y="552" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle">Open on Fluo →</text>
</svg>
  `.trim();

  try {
    const sharp = (await import("sharp")).default;
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Response(pngBuffer, {
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
