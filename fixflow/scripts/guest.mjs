/**
 * "Tjek uden konto" end to end, in beta mode (what klardal.com runs). Needs a running app started like the beta
 * suite in test-all.sh, with ADMIN_EMAILS including gaest-test@eksempel.dk.
 *
 *   BASE_URL=http://localhost:3000 node scripts/guest.mjs  (bash scripts/test-all.sh starts it for you)
 */
import { chromium, devices } from "playwright-core";

const B = process.env.BASE_URL || "http://localhost:3000";
const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errs = [];
let n = 0;
const ok = (cond, msg) => {
  if (!cond) throw new Error("FAIL: " + msg);
  n++;
  console.log("  ✓ " + msg);
};
async function phone() {
  const ctx = await br.newContext({ ...devices["iPhone 13"], locale: "da-DK" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  return p;
}
const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const post = (p, url, body) =>
  p.evaluate(async ([u, b]) => (await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })).status, [url, body]);

const p = await phone();
await p.goto(B + "/?utm_source=facebook&utm_medium=paid");
ok((await p.getByTestId("hero-cta").getAttribute("href")) === "/tjek", "the homepage button starts a check without an account");
await p.getByTestId("hero-cta").click();
await p.waitForURL(B + "/tjek");
ok(await noOverflow(p), "the start page fits a phone (390 px)");
const intro = await p.innerText("main, body");
ok(intro.includes("uden konto") && intro.includes("7 dage"), "the start page says no account is needed and how long the check is kept");

await p.getByRole("button", { name: "Start tjekket" }).click();
// (Next.js adds its own empty role=alert route announcer, so look inside the form.)
await p.locator("form [role=alert]").waitFor();
ok((await p.locator("form [role=alert]").innerText()).includes("acceptere"), "the terms must be accepted first (18+, terms, privacy)");
ok(p.url() === B + "/tjek", "nothing happens without accepting");

await p.locator("input[name=acceptTerms]").check();
await p.getByRole("button", { name: "Start tjekket" }).click();
await p.waitForURL(B + "/dashboard/upload");
ok(true, "one tap later the visitor is on the upload page – no e-mail, no password");
const banner = await p.getByTestId("guest-banner").innerText();
ok(banner.includes("uden konto") && banner.includes("7 dage"), "a banner explains the check is deleted after 7 days without an account");
const body = (await p.content()) + (await p.innerText("body"));
ok(!body.includes(".invalid") && !body.includes("gaest-"), "the placeholder e-mail is never shown");
ok(((await p.locator("aside").textContent()) ?? "").includes("Gæst"), "the menu calls the visitor Gæst");
ok(await noOverflow(p), "upload page with the banner fits a phone");

await p.setInputFiles("[data-testid=file-input]", "sample-quotes/eksempel-vvs-badevaerelse.pdf");
await p.getByRole("button", { name: "Analysér tilbuddet" }).click();
await p.waitForURL(/\/dashboard\/tilbud\//, { timeout: 60_000 });
await p.getByRole("heading", { name: "Renovering af badeværelse" }).waitFor();
ok((await p.content()).includes("tilbuddets største enkeltpost"), "the guest sees the full analysis");
const quoteUrl = p.url();

await p.goto(B + "/dashboard/upload");
await p.getByTestId("guest-used").waitFor();
ok((await p.getByTestId("guest-used").innerText()).includes("Opret gratis konto"), "after 1 check the guest is asked to create a free account");
const extra = await p.evaluate(async () => {
  const f = new FormData();
  f.append("file", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "x.pdf");
  return (await fetch("/api/quotes", { method: "POST", body: f })).status;
});
ok(extra === 402, `a second upload is refused by the server (${extra})`);
ok((await post(p, "/api/billing/checkout", { kind: "SINGLE", consent: true })) === 403, "a guest can't buy (Stripe needs a real e-mail)");
ok((await post(p, "/api/codes", { code: "E2E" })) === 403, "a guest can't redeem a partner code (it would be lost)");
await p.goto(B + "/dashboard/konto");
ok(p.url().startsWith(B + "/opret"), "the account page sends a guest to create an account");
await p.goto(B + "/tjek");
ok(p.url() === B + "/dashboard/upload", "a guest who comes back to /tjek goes straight to their check");

// Another browser is another guest and can never see the first guest's quote.
const other = await phone();
await other.goto(B + "/tjek");
await other.locator("input[name=acceptTerms]").check();
await other.getByRole("button", { name: "Start tjekket" }).click();
await other.waitForURL(B + "/dashboard/upload");
const probe = await other.goto(quoteUrl);
ok(probe.status() === 404, `another guest gets 404 on the first guest's quote (${probe.status()})`);
await other.goto(B + "/dashboard");
ok(!(await other.innerText("body")).includes("Renovering af badeværelse"), "another guest's overview is empty");

// Creating an account keeps the check.
await p.goto(B + "/opret");
await p.fill("#email", "gaest-test@eksempel.dk");
await p.fill("#password", "Gaeste-Tjek-Konto-2026");
await p.locator("input[name=acceptTerms]").check();
await p.click("button[type=submit]");
await p.waitForURL(B + "/dashboard");
const dash = await p.innerText("body");
ok(dash.includes("Renovering af badeværelse"), "after creating an account the guest's quote is still there");
ok((await p.getByTestId("guest-banner").count()) === 0 && (await p.content()).includes("gaest-test@eksempel.dk"), "the guest banner is gone and the account shows the e-mail");
await p.goto(quoteUrl);
await p.getByRole("heading", { name: "Renovering af badeværelse" }).waitFor();
ok(true, "the analysis opens on the new account");
await p.goto(B + "/dashboard/upload");
ok((await p.locator("[data-testid=file-input]").count()) === 1, "the new account can check more quotes (3 in total, 1 used)");
await p.goto(B + "/dashboard/konto");
ok((await p.innerText("main")).includes("1 af 3"), "the account page shows 1 of 3 analyses used");
const relogin = await post(p, "/api/auth/guest", { acceptTerms: true });
ok(relogin === 200 && (await p.goto(B + "/dashboard")) && (await p.getByTestId("guest-banner").count()) === 0, "starting a guest check while signed in does not replace the account");

await p.goto(B + "/dashboard/admin");
const signups = await p.getByTestId("admin-signups").innerText();
const today = signups.split("\n").find((l) => /^\d{4}-\d{2}-\d{2}\t/.test(l)) ?? "";
// Today: the seeded demo account + the converted guest. The second (unclaimed) guest is not an account.
ok(/^\S+\t2\t/.test(today), `admin counts the converted guest as a new account, but not the unclaimed guest (${today})`);
const usage = await p.getByTestId("admin-totals").innerText();
const row = (label) => usage.split("\n").find((l) => l.startsWith(label)) ?? "";
ok(/\t2\t2\t2\t2$/.test(row("Tjek uden konto startet")), `admin counts 2 guest checks (${row("Tjek uden konto startet")})`);
ok(/\t1\t1\t1\t1$/.test(row("Gæst oprettede konto")), `admin counts 1 guest who created an account (${row("Gæst oprettede konto")})`);

for (const legal of ["/privatlivspolitik", "/handelsbetingelser"]) {
  await p.goto(B + legal);
  const text = await p.innerText("main");
  ok(text.includes("uden konto") && text.includes("7 dage"), `${legal} describes the check without an account and the 7-day deletion`);
}
ok(errs.length === 0, "no page errors " + errs.join("; "));
await br.close();
console.log(`\n${n} checks passed`);
