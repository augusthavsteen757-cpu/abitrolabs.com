/**
 * Klardal as it runs live: the old quote-check tool is closed (no OLD_TOOL), only the booking service is open.
 * Needs a local server with a local database (it writes one old call-me request to check the automatic deletion).
 *
 *   BASE_URL=http://localhost:3000 node scripts/closed.mjs
 */
import { createHmac } from "node:crypto";
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
const personal = await get("/tilmeld/rask-klip");
const personalHtml = await personal.text();
ok(personal.status === 200 && personalHtml.includes("Velkommen, Rask Klip") && personalHtml.includes("Dameklip (45 min)") && /<meta name="robots" content="noindex, nofollow"/.test(personalHtml), "personal link /tilmeld/rask-klip is filled in and stays off Google");
ok((await get("/tilmeld/findes-ikke")).status === 404, "unknown personal link → 404");
ok((await get("/tilmeld/constructor")).status === 404, "personal link can't reach object internals");
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
ok((await signup({ ...good, betaling: "faktura" })).status === 400, "manual invoice is no longer a payment option");
ok((await get("/api/tilmeld", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(good) })).status === 403, "sign-up from another site is blocked (CSRF)");
const okSignup = await signup(good);
ok(okSignup.status === 200, `a complete sign-up is accepted (${okSignup.status})`);
ok((await okSignup.json()).checkoutUrl === null, "without Stripe keys, card sign-ups are saved and no checkout link is invented");
const thanks = await get("/tilmeld/tak");
ok(thanks.status === 200 && (await thanks.text()).includes("Kortet er gemt"), "/tilmeld/tak (back from Stripe) works");
ok((await (await get("/tilmeld/tak?betaling=afbrudt")).text()).includes("Kortet blev ikke lagt ind"), "/tilmeld/tak explains a cancelled card");

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

// Automatic card payment: Stripe's webhook marks the sign-up's card as approved, and later as cancelled.
const signupRow = (await db.execute("SELECT id, payment, payment_status FROM signups")).rows[0];
ok(signupRow.payment === "kort" && signupRow.payment_status === "afventer", "a new sign-up waits for its card (kort, afventer)");
const hook = (event) => {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_closedtest").update(`${t}.${body}`).digest("hex");
  return get("/api/billing/webhook", { method: "POST", headers: { "stripe-signature": `t=${t},v1=${sig}`, "content-type": "application/json" }, body });
};
ok((await get("/api/billing/webhook", { method: "POST", body: "{}" })).status === 400, "webhook without a Stripe signature is refused");
ok((await hook({ type: "checkout.session.completed", data: { object: { id: "cs_1", subscription: "sub_klardal_1", payment_status: "no_payment_required", metadata: { signupId: String(signupRow.id) } } } })).status === 200, "Stripe webhook is accepted");
let st = (await db.execute({ sql: "SELECT payment_status, stripe_subscription FROM signups WHERE id = ?", args: [signupRow.id] })).rows[0];
ok(st.payment_status === "godkendt" && st.stripe_subscription === "sub_klardal_1", "card saved → sign-up marked godkendt");
await hook({ type: "customer.subscription.deleted", data: { object: { id: "sub_klardal_1" } } });
st = (await db.execute({ sql: "SELECT payment_status FROM signups WHERE id = ?", args: [signupRow.id] })).rows[0];
ok(st.payment_status === "opsagt", "subscription ended → sign-up marked opsagt");

// "Klar til AI": customer profile pages with schema.org JSON-LD and llms.txt
{
  const r = await get("/firma/eksempel-snedker");
  const html = await r.text();
  ok(r.status === 200, `/firma/eksempel-snedker → 200 (${r.status})`);
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let j = null;
  try { j = ld && JSON.parse(ld[1]); } catch { j = null; }
  ok(j?.["@type"] === "HomeAndConstructionBusiness" && j.openingHoursSpecification?.length === 1 && j.hasOfferCatalog?.itemListElement?.length === 4, "profile has schema.org JSON-LD with hours and prices");
  ok(/<meta name="robots" content="noindex, nofollow"/.test(html), "example profile is noindex");
  ok(html.includes("Firmaet findes ikke"), "example profile shows the example banner");
  const t = await get("/firma/eksempel-snedker/llms.txt");
  const txt = await t.text();
  ok(t.status === 200 && t.headers.get("content-type")?.startsWith("text/markdown") && txt.includes("# Eksempel Snedkeri") && txt.includes("Mandag til fredag 07:00-16:00"), "profile llms.txt has the facts");
  ok(t.headers.get("x-robots-tag") === "noindex", "example llms.txt is noindex");
  ok((await get("/firma/findes-ikke")).status === 404, "unknown profile → 404");
  ok((await get("/firma/findes-ikke/llms.txt")).status === 404, "unknown profile llms.txt → 404");
  ok((await get("/firma/__proto__")).status === 404, "prototype key is not a profile");
  ok(!(await (await get("/sitemap.xml")).text()).includes("eksempel-snedker"), "example profile is not in the sitemap");
  ok((await (await get("/llms.txt")).text()).includes("Perplexity"), "Klardal llms.txt mentions the monthly AI check");
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exitCode = failed ? 1 : 0;
