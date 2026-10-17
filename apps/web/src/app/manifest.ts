import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fluo - Campus Commerce, Services & Rides",
    short_name: "Fluo",
    description: "Discover local shops, order food, book appointments, ride keke/bikes, and attend events.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0b0b",
    orientation: "portrait",
    categories: ["shopping", "business", "lifestyle", "travel"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
