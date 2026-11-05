import type { MetadataRoute } from "next";
import { KUNDER } from "@/lib/kunder";

// Only the booking service. The old quote-check pages still work but are kept out of Google (see middleware).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "https://klardal.com";
  const pages = ["", "/om", "/privatlivspolitik"];
  // Customer profiles (not the examples) so search engines and AI crawlers find them.
  const kunder = Object.entries(KUNDER).filter(([, k]) => !k.eksempel).map(([slug]) => `/firma/${slug}`);
  return [...pages, ...kunder].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 }));
}
