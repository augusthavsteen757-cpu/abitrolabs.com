import type { MetadataRoute } from "next";

// Only the booking service. The old quote-check pages still work but are kept out of Google (see middleware).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "https://klardal.com";
  const pages = ["", "/om", "/privatlivspolitik"];
  return pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 }));
}
