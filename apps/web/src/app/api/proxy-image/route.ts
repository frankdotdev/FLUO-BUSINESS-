// Image Proxy for Fluo Social Share Cards and Canvas Exports
// Enables cross-origin safe image loading for client-side HTML5 canvas generation.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    // Allow http and https URLs only
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response("Invalid protocol", { status: 400 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "FluoImageProxy/1.0",
      },
    });

    if (!res.ok) {
      return new Response(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const arrayBuffer = await res.arrayBuffer();

    return new Response(new Uint8Array(arrayBuffer), {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    return new Response(`Proxy error: ${err.message}`, { status: 500 });
  }
}
