/**
 * Read-only smoke test of a running Klardal (no logins, no uploads, no AI cost) – safe against production.
 *
 *   BASE_URL=https://klardal.com node scripts/smoke.mjs
 *   BASE_URL=https://klardal.com EXTRA_HOSTS=https://www.klardal.com,https://klardal.dk node scripts/smoke.mjs
 */
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EXTRA = (process.env.EXTRA_HOSTS || "").split(",").filter(Boolean);
let failed = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failed++;
};
const get = (p, init = {}) => fetch(BASE + p, { redirect: "manual", ...init });

console.log(`Smoke test: ${BASE}`);

for (const p of ["/", "/priser", "/login", "/opret", "/glemt-adgangskode", "/handelsbetingelser", "/privatlivspolitik"]) {
  const r = await get(p);
  const html = await r.text();
  ok(r.status === 200 && html.includes("Klardal"), `${p} → 200 and shows Klardal (${r.status})`);
  ok(!/\[Virksomhedens navn\]|\[CVR-nummer\]|\[kontakt@/.test(html), `${p} has no unfilled company placeholders`);
}

const home = await get("/");
const h = home.headers;
ok(/default-src 'self'/.test(h.get("content-security-policy") ?? ""), "Content-Security-Policy set");
ok(/max-age=\d+/.test(h.get("strict-transport-security") ?? ""), "HSTS set");
ok(h.get("x-frame-options") === "DENY", "clickjacking protection (X-Frame-Options)");
ok(h.get("x-content-type-options") === "nosniff", "nosniff set");
ok(!h.get("x-powered-by"), "no X-Powered-By leak");

const robots = await (await get("/robots.txt")).text();
ok(/Disallow: \/dashboard/.test(robots) && /Sitemap: https?:\/\//.test(robots), "robots.txt hides /dashboard and points to the sitemap");
ok(/User-Agent: GPTBot/i.test(robots) && /User-Agent: Google-Extended/i.test(robots) && !/Disallow: \/\s*$/m.test(robots), "robots.txt welcomes AI assistants and blocks nothing public");
const llms = await get("/llms.txt");
const llmsText = await llms.text();
ok(llms.status === 200 && llmsText.startsWith("# Klardal") && llmsText.includes("/priser") && !/undefined|NaN/.test(llmsText), "llms.txt describes Klardal for AI assistants");
const iconHtml = await (await get("/")).text();
ok(/"alternateName":\["klardal.com","Klardahl"/.test(iconHtml) && llmsText.includes("Klardahl"), "common misspellings (Klardahl) point to Klardal for search engines and AI");
const privacy = await (await get("/privatlivspolitik")).text();
ok(privacy.includes('data-testid="legal-summary"') && privacy.includes("Anthropic, PBC (USA)") && privacy.includes("overførsel til et tredjeland") && privacy.includes("standardkontraktbestemmelser"), "privacy policy explains the AI transfer to the USA and its legal basis");
const privacyEn = await (await get("/privatlivspolitik", { headers: { cookie: "ff_lang=en" } })).text();
ok(privacyEn.includes("outside the EU") && privacyEn.includes("standard contractual clauses"), "privacy summary in the reader's language");
const article = await get("/artikler/hvad-koster-et-nyt-badevaerelse");
const articleHtml = await article.text();
ok(article.status === 200 && /<meta name="robots" content="noindex, follow"/.test(articleHtml) && articleHtml.includes('"@type":"Article"') && articleHtml.includes('"@type":"BreadcrumbList"') && articleHtml.includes('<link rel="canonical" href="https://klardal.com/artikler/hvad-koster-et-nyt-badevaerelse"/>'), "article template: title, canonical, Article + breadcrumb data, draft kept out of Google");
ok(/data-testid="article-cta"[\s\S]*href="\/opret\?next=%2Fdashboard%2Fupload"/.test(articleHtml), "article ends with \"Tjek et tilbud gratis\"");
const sitemapText = await (await get("/sitemap.xml")).text();
ok(!sitemapText.includes("/artikler/hvad-koster-et-nyt-badevaerelse") && sitemapText.includes("/artikler/tjek-dit-haandvaerkertilbud"), "draft articles are not in the sitemap, published ones are");
const guide = await get("/artikler/tjek-dit-haandvaerkertilbud");
const guideHtml = await guide.text();
ok(guide.status === 200 && !/noindex/.test(guideHtml) && guideHtml.includes('<link rel="canonical" href="https://klardal.com/artikler/tjek-dit-haandvaerkertilbud"/>'), "published guide can be indexed and has its own canonical");
// Every public page names itself as canonical – not the front page – or Google drops it as a duplicate.
for (const p of ["/priser", "/handelsbetingelser", "/privatlivspolitik", "/artikler", "/opret", "/login"]) {
  const html = await (await get(p)).text();
  ok(html.includes(`<link rel="canonical" href="https://klardal.com${p}"/>`), `${p} has its own canonical`);
}
ok(/<link rel="canonical" href="https:\/\/klardal\.com\/?"\/>/.test(await (await get("/")).text()), "front page canonical");
ok((await get("/artikler/findes-ikke")).status === 404, "unknown article gives 404");
const typo = await get("/priser", { headers: { "x-forwarded-host": "www.klardahl.dk" } });
ok(typo.status === 301 && /\/priser$/.test(typo.headers.get("location") ?? "") && !(typo.headers.get("location") ?? "").includes("klardahl"), `klardahl.dk sends visitors to the main domain (${typo.status})`);
ok(/<link rel="icon" href="\/icon2.png[^"]*" type="image\/png" sizes="192x192"/.test(iconHtml) && (await get("/icon2.png")).status === 200, "192 px PNG logo is linked for Google results");
const sitemap = await get("/sitemap.xml");
ok(sitemap.status === 200 && (await sitemap.text()).includes("<urlset"), "sitemap.xml is valid");

// Icons and structured data Google uses for the favicon and site name in search results.
for (const [p, type] of [["/favicon.ico", "image/"], ["/icon1.svg", "image/svg"], ["/icon2.png", "image/png"], ["/apple-icon.png", "image/png"], ["/logo.png", "image/png"]]) {
  const r = await get(p);
  ok(r.status === 200 && (r.headers.get("content-type") ?? "").startsWith(type), `${p} served as ${type}* (${r.status})`);
}
const homeHtml = await (await get("/")).text();
ok(/<link rel="icon" href="\/favicon\.ico/.test(homeHtml) && /rel="icon" href="\/icon1\.svg/.test(homeHtml), "home page links favicon.ico and icon1.svg");
const ld = homeHtml.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
let ldOk = false;
try {
  const g = JSON.parse(ld)["@graph"];
  ldOk = g.some((n) => n["@type"] === "WebSite" && n.name === "Klardal") && g.some((n) => n["@type"] === "Organization" && /\/logo\.png$/.test(n.logo));
} catch {}
ok(ldOk, "home page has WebSite + Organization structured data (site name and logo)");

const health = await get("/api/health");
ok(health.status === 200, `health check → 200 (${health.status})`);

const dash = await get("/dashboard");
ok([302, 307, 308].includes(dash.status) && (dash.headers.get("location") ?? "").includes("/login"), "dashboard requires login");
ok((await get("/api/quotes")).status === 401, "quote API requires login");
ok((await get("/api/quotes", { method: "POST" })).status === 403, "POST without same-site Origin is blocked (CSRF)");
ok((await get("/api/quotes", { method: "POST", headers: { origin: BASE } })).status === 401, "POST from own site still requires login");
ok((await get("/api/billing/checkout", { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: "{}" })).status === 401, "checkout requires login");
ok((await get("/findes-ikke-" + Date.now())).status === 404, "unknown page → 404");
ok((await get("/login?next=%2F%5Cevil.example")).status === 200, "login page with crafted ?next renders (redirect is checked client-side)");

for (const extra of EXTRA) {
  const r = await fetch(extra.replace(/\/$/, "") + "/priser", { redirect: "manual" }).catch(() => null);
  const loc = r?.headers.get("location") ?? "";
  ok(!!r && [301, 302, 307, 308].includes(r.status) && loc.startsWith(BASE), `${extra} redirects to ${BASE} (${r?.status ?? "no answer"} → ${loc})`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exitCode = failed ? 1 : 0;
