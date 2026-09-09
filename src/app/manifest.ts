import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Craps",
    short_name: "Craps",
    description: "Live-table craps companion",
    start_url: "/",
    display: "standalone",
    background_color: "#071c16",
    theme_color: "#0f3d2e",
    orientation: "any",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
