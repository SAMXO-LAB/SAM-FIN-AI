import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finance Book AI",
    short_name: "Finance Book AI",
    description: "One intelligent place for your spending, savings, loans, goals and financial future.",
    lang: "en-IN",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05060A",
    theme_color: "#1D4ED8",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Transactions", short_name: "Transactions", url: "/transactions", icons: [{ src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Ask Sam", short_name: "Ask Sam", url: "/assistant", icons: [{ src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Loans", short_name: "Loans", url: "/loans", icons: [{ src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
