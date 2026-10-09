import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "https://klardal.com";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/nulstil"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
