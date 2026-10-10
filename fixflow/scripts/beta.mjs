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
await p.goto(B + "/opret");
const email = `beta${Date.now()}@eksempel.dk`;
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
ok(errs.length === 0, "no page errors " + errs.join(";"));
await br.close();
