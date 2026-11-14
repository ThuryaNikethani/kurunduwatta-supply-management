import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "කුරුඳුවත්ත බඩු ලැයිස්තු",
    short_name: "බඩු ලැයිස්තු",
    description: "කුරුඳුවත්ත විලා කුස්සියට ඕන බඩු අනුමත කරගන්න",
    lang: "si",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f6ee",
    theme_color: "#13281b",
    // Athukorala Group logo on white.
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
