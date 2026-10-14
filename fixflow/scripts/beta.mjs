/**
 * Beta mode (BETA_FREE=1) – the mode that runs on klardal.com: free, capped, nothing can be bought.
 *   BETA_FREE=1 ALLOW_LOCAL_DB=1 ALLOW_DEMO_MODE=1 npm start
 *   BASE_URL=http://localhost:3000 CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/beta.mjs
 */
import { chromium } from "playwright-core";
const B = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await br.newContext({ locale: "da-DK" });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message));
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ✓ " + m); };
await p.goto(B);
ok(await p.getByTestId("beta-notice").isVisible(), "landing shows beta notice instead of prices");
ok(!(await p.innerText("body")).includes("Vælg Pro"), "no Pro purchase button on landing");
ok(!(await p.innerText("body")).includes("Er der et abonnement?"), "FAQ hides the payment question while nothing can be bought");
ok(!/\bPro\b/.test(await p.innerText("body")), "no Pro anywhere on the landing page");
ok((await p.getByTestId("beta-banner").innerText()).includes("Gratis prøveperiode – slutter 19. oktober 2026."), "banner on every page states when the trial ends");
await p.goto(B + "/priser");
const plansBox = p.getByTestId("beta-plans");
const plansText = await plansBox.innerText();
ok(/0 kr\.[\s\S]*Gratis nu[\s\S]*Efter prøveperioden: 29 kr\.[\s\S]*Efter prøveperioden: 49 kr\./.test(plansText), "pricing page: both plans free now, with the later price stated");
ok((await p.getByTestId("beta-later").innerText()).startsWith("Prøveperioden slutter 19. oktober 2026."), "pricing box states the end date");
ok((await p.getByTestId("beta-notice").innerText()).includes("Gratis frem til 19. oktober 2026"), "pricing box title has the end date");
ok((await p.getByTestId("beta-notice").innerText()).includes("op til 3 tilbud"), "new accounts are offered 3 free analyses");
ok((await plansBox.locator("s, del, .line-through").count()) === 0, "no struck-through 'before' price (never charged – would be misleading)");
await p.goto(B);
// COMPANY_FOOTER_ADDRESS=0 (set by test-all): CVR in the footer without the address – the legal pages keep it.
const footer = await p.locator("footer").innerText();
ok(footer.includes("CVR under registrering") && footer.includes("kontakt@klardal.com") && !footer.includes("Strandhuse"), "footer shows CVR and e-mail without the address");
for (const legal of ["/handelsbetingelser", "/privatlivspolitik"]) {
  const page = await ctx.newPage(); await page.goto(B + legal);
  ok((await page.innerText("main")).includes("Strandhuse 93, 5700 Svendborg"), `${legal} still shows the address`);
  await page.close();
}
await p.goto(B + "/opret");
const email = "beta-tester@eksempel.dk"; // fresh database per run; also ADMIN_EMAILS in test-all
await p.fill("#name", "Beta Tester"); await p.fill("#email", email); await p.fill("#password", "Kaffekande-Solsikke-77");
await p.locator("input[type=checkbox]").first().check();
await p.click("button[type=submit]"); await p.waitForURL(B + "/dashboard");
ok((await p.innerText("body")).includes("Gratis prøveperiode"), "nav shows beta plan");
ok(!(await p.innerText("body")).includes("Opgradér til Pro"), "no upgrade link");
for (let i = 0; i < 3; i++) {
  await p.goto(B + "/dashboard/upload");
  await p.setInputFiles("[data-testid=file-input]", "sample-quotes/eksempel-vvs-badevaerelse.pdf");
  await p.getByRole("button", { name: "Analysér tilbuddet" }).click();
  await p.waitForURL(/tilbud\//, { timeout: 30000 });
  if (i === 0) {
    const html = await p.innerText("body");
    ok((await p.content()).includes("tilbuddets største enkeltpost"), "free beta user sees full (unlocked) analysis");
    ok(!html.includes("Gå til betaling"), "no checkout on analysis page");
  }
}
await p.goto(B + "/dashboard/admin");
const usage = await p.getByTestId("admin-totals").innerText();
const row = (label) => usage.split("\n").find((l) => l.startsWith(label)) ?? "";
ok(/\t3\t3\t3\t3$/.test(row("Analyse fuldført")), `3 analyses counted (${row("Analyse fuldført")})`);
ok(/\t1\t1\t1\t1$/.test(row("Tilbud nr. 2 i samme projekt")), `second quote in the same project counted once, not per upload (${row("Tilbud nr. 2 i samme projekt")})`);
await p.goto(B + "/dashboard/upload");
await p.getByText("Du har brugt dine 3 gratis analyser").waitFor();
ok(true, "new account: after 3 analyses the beta limit message, no purchase");
const extra = await p.evaluate(async () => { const f = new FormData(); f.append("file", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "x.pdf"); return (await fetch("/api/quotes", { method: "POST", body: f })).status; });
ok(extra === 402, `a 4th upload is refused by the API (${extra})`);
await p.goto(B + "/dashboard/sammenlign");
ok(!(await p.innerText("body")).includes("Sammenligning er en del af Pro"), "compare available in beta");
await p.goto(B + "/dashboard/konto");
ok((await p.innerText("body")).includes("Du er med i prøveperioden, som slutter 19. oktober 2026."), "account page shows the trial end date");
ok((await p.locator("text=Køb 1 analyse").count()) === 0, "no purchase buttons on account page");
const r = await p.evaluate(async () => (await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "SINGLE", consent: true }) })).status);
ok(r === 503, "checkout API refuses purchases in beta");
await p.goto(B + "/dashboard/find");
ok(await p.getByTestId("find-soon").isVisible(), "find shows coming soon instead of fictional firms");
const fr = await p.evaluate(async () => (await fetch("/api/contractors?trade=vvs&postalCode=4000")).status);
ok(fr === 503, "contractor API off in beta without CVR");
await p.goto(B + "/handelsbetingelser");
ok((await p.innerText("body")).includes("Gratis prøveperiode"), "terms describe the beta");
ok((await p.innerText("body")).includes("gratis prøveperiode, som slutter den 19. oktober 2026"), "terms state the trial end date");
ok((await p.innerText("body")).includes("op til 3 tilbud") && (await p.innerText("body")).includes("beholder du de 5"), "terms: 3 for new accounts, older accounts keep 5");
// A user who had Pro and a test payment from before the beta (the seeded demo user) gets the beta deal:
// 5 in total (an account from before the trial went down to 3 keeps its 5), no Pro, no period – and test payments are never shown on a production build without
// ALLOW_SIMULATED_PAYMENTS (klardal.com).
const old = await (await br.newContext({ locale: "da-DK" })).newPage();
old.on("pageerror", (e) => errs.push(e.message));
await old.goto(B + "/login");
await old.fill("#email", "demo@klardal.dk"); await old.fill("#password", process.env.DEMO_PASSWORD || "Klardal-Test-2026");
await old.click("button[type=submit]"); await old.waitForURL(/\/dashboard/);
await old.goto(B + "/dashboard/konto");
const acc = await old.innerText("main");
ok(/3 af 5/.test(acc) && !/af 10/.test(acc), "beta account shows 3 of 5 analyses, not the old Pro quota");
ok(!/Pro – 1 måned|Testbetaling|Fortryd købet|nulstilles/.test(acc), "no Pro plan, period or test payment in the beta");
const nav = await old.innerText("aside");
ok(nav.includes("Gratis prøveperiode") && nav.includes("3/5"), "sidebar shows the beta plan with 3/5");
ok(errs.length === 0, "no page errors " + errs.join(";"));
await br.close();
