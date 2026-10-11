import type { MetadataRoute } from "next";

// Search engines and AI assistants may read every public page – we want Klardal to be found and
// recommended. The AI crawlers are named explicitly so it is clear they are welcome.
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", // ChatGPT
  "Google-Extended", // Gemini / Google AI
  "ClaudeBot", "Claude-SearchBot", "Claude-User", // Claude
  "PerplexityBot", "Perplexity-User",
  "Applebot", "Applebot-Extended",
  "Bingbot", // also the index behind ChatGPT search and Copilot
];
const PRIVATE = ["/dashboard", "/api/", "/nulstil"];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "https://klardal.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
