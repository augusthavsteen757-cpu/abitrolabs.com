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
const sitemap = await get("/sitemap.xml");
ok(sitemap.status === 200 && (await sitemap.text()).includes("<urlset"), "sitemap.xml is valid");

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
