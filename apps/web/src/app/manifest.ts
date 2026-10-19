import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fluo - Campus Commerce, Services & Rides",
    short_name: "Fluo",
    description: "Discover local shops, order food, book appointments, ride keke/bikes, and attend events.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f06a58",
    orientation: "portrait",
    categories: ["shopping", "business", "lifestyle", "travel"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "226x138",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/splash.png",
        sizes: "226x138",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/logo.png",
        sizes: "226x138",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/logo.png",
        sizes: "226x138",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  };
}
