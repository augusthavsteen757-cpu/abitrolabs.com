/**
 * Klardal as it runs live: the old quote-check tool is closed (no OLD_TOOL), only the booking service is open.
 * Needs a local server with a local database (it writes one old call-me request to check the automatic deletion).
 *
 *   BASE_URL=http://localhost:3000 node scripts/closed.mjs
 */
import { createClient } from "@libsql/client";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
let failed = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failed++;
};
const get = (p, init = {}) => fetch(BASE + p, { redirect: "manual", ...init });

console.log(`Closed old tool: ${BASE}`);

const OLD_PAGES = ["/tjek", "/tilbud", "/priser", "/opret", "/login", "/glemt-adgangskode", "/nulstil", "/dashboard", "/dashboard/upload", "/artikler", "/artikler/efter-regning", "/handelsbetingelser"];
for (const p of OLD_PAGES) {
  const r = await get(p);
  const to = new URL(r.headers.get("location") ?? "", BASE);
  ok(r.status === 301 && to.pathname === "/" && to.host === new URL(BASE).host, `${p} → 301 to the front page (${r.status} ${to.pathname})`);
}
ok(new URL((await get("/tjek?x=1")).headers.get("location") ?? "", BASE).search === "", "redirect drops old query strings");

for (const [p, method] of [["/api/quotes", "GET"], ["/api/quotes", "POST"], ["/api/auth/login", "POST"], ["/api/auth/guest", "POST"], ["/api/contractors", "GET"], ["/api/billing/checkout", "POST"]]) {
  const r = await get(p, { method, headers: { origin: BASE } });
  ok(r.status === 410, `${method} ${p} is closed (${r.status})`);
}
ok((await get("/api/health")).status === 200, "health check still works");

// The pages that stay open must not mention or link to the old tool.
for (const p of ["/", "/om", "/privatlivspolitik"]) {
  const r = await get(p);
  const html = await r.text();
  // Visible text and meta tags (the scripts carry the shared translation table, which is not shown).
  const shown = html.replace(/<script[\s\S]*?<\/script>/g, "");
  ok(r.status === 200, `${p} → 200`);
  ok(!/håndværkertilbud|Analysér et tilbud|prøveperiode/i.test(shown), `${p} has no old quote-check text or meta description`);
  ok(!/href="\/(tjek|tilbud|priser|login|opret|dashboard|artikler|handelsbetingelser)/.test(html), `${p} has no links to closed pages`);
  ok(!html.includes('data-testid="beta-banner"'), `${p} has no old beta banner`);
}
const home = await (await get("/")).text();
ok(/"@type":"WebSite"[^<]*"name":"Klardal"/.test(home) && /"@type":"Organization"[^<]*"logo":"[^"]*\/logo\.png"/.test(home), "front page tells Google the site name and logo");
const privacy = await (await get("/privatlivspolitik")).text();
ok(privacy.includes("Når I beder os ringe") && privacy.includes("180 dage") && privacy.includes("Det tidligere tilbudsværktøj"), "privacy policy covers the call-me form, deletion and the closed tool");
const llms = await (await get("/llms.txt")).text();
ok(!/\/tilbud|\/tjek|\/artikler|håndværk/.test(llms), "llms.txt no longer sends AI assistants to the old tool");

// Sign-up link, terms and data processing agreement (open while the old tool is closed).
const tilmeld = await get("/tilmeld?firma=Rask%20Klip&pakke=199");
const tilmeldHtml = await tilmeld.text();
ok(tilmeld.status === 200 && tilmeldHtml.includes("Velkommen, Rask Klip") && /<meta name="robots" content="noindex, follow"/.test(tilmeldHtml), "/tilmeld works, fills in the firm and stays off Google");
ok(/<input[^>]*name="pakke" checked="" value="199"/.test(tilmeldHtml) && !/<input[^>]*name="pakke" checked="" value="149"/.test(tilmeldHtml), "/tilmeld picks the package from the link");
for (const [p, text] of [["/vilkaar", "Ingen binding"], ["/databehandleraftale", "Underdatabehandlere"]]) {
  const r = await get(p);
  const html = await r.text();
  ok(r.status === 200 && html.includes(text.replace("Ingen binding", "ingen binding")) && /CVR (<!-- -->)?46839994/.test(html), `${p} → 200 with Klardal's CVR`);
}
ok(home.includes('href="/vilkaar"'), "front page links to the terms");
const signup = (body) => get("/api/tilmeld", { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: JSON.stringify(body) });
const good = { firma: "Rask Klip", navn: "Lone", telefon: "+45 12 34 56 78", email: "lone@eksempel.dk", pakke: "149", tilvalg: ["opslag"], accept: true };
ok((await signup({ ...good, accept: false })).status === 400, "sign-up without the yes-box is refused");
ok((await signup({ ...good, telefon: "123" })).status === 400, "sign-up with a wrong phone number is refused");
ok((await signup({ ...good, email: "ikke-en-mail" })).status === 400, "sign-up with a wrong e-mail is refused");
ok((await signup({ ...good, pakke: "999" })).status === 400, "sign-up with an unknown package is refused");
ok((await signup({ ...good, tilvalg: ["noget-andet"] })).status === 400, "sign-up with an unknown extra is refused");
ok((await get("/api/tilmeld", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(good) })).status === 403, "sign-up from another site is blocked (CSRF)");
const okSignup = await signup(good);
ok(okSignup.status === 200, `a complete sign-up is accepted (${okSignup.status})`);

// The call-me form still works, and old requests are deleted automatically (privacy policy promise).
const db = createClient({ url: "file:data/fixflow.db" });
const old = Date.now() - 181 * 86_400_000;
await db.execute({ sql: "INSERT INTO callback_requests (phone, company, created_at) VALUES (?, ?, ?)", args: ["11 11 11 11", "Gammel", old] });
const ring = await get("/api/ring", { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: JSON.stringify({ telefon: "22 33 44 55", firma: "Lukket-test" }) });
ok(ring.status === 200, `call-me form works while the old tool is closed (${ring.status})`);
const rows = (await db.execute("SELECT phone FROM callback_requests")).rows.map((r) => r.phone);
const saved = (await db.execute("SELECT company, phone, plan, details FROM signups")).rows;
ok(saved.length === 1 && saved[0].company === "Rask Klip" && saved[0].phone === "12 34 56 78" && saved[0].plan === "149" && JSON.parse(saved[0].details).tilvalg[0] === "opslag", "the sign-up is saved with phone, package and extras");
ok(rows.includes("22 33 44 55") && !rows.includes("11 11 11 11"), "requests older than 180 days are deleted automatically");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exitCode = failed ? 1 : 0;
