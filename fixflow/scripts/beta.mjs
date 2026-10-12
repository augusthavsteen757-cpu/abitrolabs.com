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
ok(!(await p.innerText("body")).includes("Kan jeg opsige Pro?"), "FAQ hides the Pro question while nothing can be bought");
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
ok((await p.innerText("body")).includes("Gratis beta"), "nav shows beta plan");
ok(!(await p.innerText("body")).includes("Opgradér til Pro"), "no upgrade link");
for (let i = 0; i < 5; i++) {
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
ok(/\t5\t5\t5\t5$/.test(row("Analyse fuldført")), `5 analyses counted (${row("Analyse fuldført")})`);
ok(/\t1\t1\t1\t1$/.test(row("Tilbud nr. 2 i samme projekt")), `second quote in the same project counted once, not per upload (${row("Tilbud nr. 2 i samme projekt")})`);
await p.goto(B + "/dashboard/upload");
await p.getByText("Du har brugt dine 5 gratis analyser").waitFor();
ok(true, "after 5 analyses: beta limit message, no purchase");
await p.goto(B + "/dashboard/sammenlign");
ok(!(await p.innerText("body")).includes("Sammenligning er en del af Pro"), "compare available in beta");
await p.goto(B + "/dashboard/konto");
ok((await p.innerText("body")).includes("Du er med i betaperioden"), "account page shows beta text");
ok((await p.locator("text=Køb én analyse").count()) === 0, "no purchase buttons on account page");
const r = await p.evaluate(async () => (await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "SINGLE", consent: true }) })).status);
ok(r === 503, "checkout API refuses purchases in beta");
await p.goto(B + "/dashboard/find");
ok(await p.getByTestId("find-soon").isVisible(), "find shows coming soon instead of fictional firms");
const fr = await p.evaluate(async () => (await fetch("/api/contractors?trade=vvs&postalCode=4000")).status);
ok(fr === 503, "contractor API off in beta without CVR");
await p.goto(B + "/handelsbetingelser");
ok((await p.innerText("body")).includes("Gratis betaperiode"), "terms describe the beta");
// A user who had Pro and a test payment from before the beta (the seeded demo user) gets the beta deal:
// 5 in total, no Pro, no period – and test payments are never shown on a production build without
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
ok(nav.includes("Gratis beta") && nav.includes("3/5"), "sidebar shows the beta plan with 3/5");
ok(errs.length === 0, "no page errors " + errs.join(";"));
await br.close();
