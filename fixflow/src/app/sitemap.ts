import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "https://klardal.com";
  const pages = ["", "/priser", "/opret", "/login", "/handelsbetingelser", "/privatlivspolitik"];
  return pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.5 }));
}
