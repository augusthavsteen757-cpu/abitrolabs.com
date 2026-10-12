import type { MetadataRoute } from "next";
import { publishedArticles } from "@/content/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "https://klardal.com";
  const pages = ["", "/priser", "/opret", "/login", "/handelsbetingelser", "/privatlivspolitik"];
  const articles = publishedArticles();
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    // Guides appear here only when at least one is published (drafts never).
    ...(articles.length ? [{ url: `${base}/artikler`, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    ...articles.map((a) => ({ url: `${base}/artikler/${a.slug}`, lastModified: a.updated, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
