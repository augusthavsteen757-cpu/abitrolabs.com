/**
 * End-to-end check of the main user flows (Definition of done).
 * Requires a running app (npm run build && npm start) with seeded demo data, in demo mode.
 *
 *   BASE_URL=http://localhost:3000 node scripts/e2e.mjs
 *
 * Uses playwright-core with a locally installed Chromium (CHROMIUM_PATH, or Playwright's default).
 */
import { chromium } from "playwright-core";
import path from "path";
import { mkdirSync } from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const BASE = process.env.BASE_URL || "http://localhost:3000";
// Same as src/lib/demo.ts DEMO_PASSWORD (the seeded demo account; demo mode only).
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Klardal-Test-2026";
const SHOTS = process.env.SCREENSHOT_DIR || "screenshots";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
let step = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function newPage(width = 1280, height = 900, locale = "da-DK") {
  const ctx = await browser.newContext({ viewport: { width, height }, locale, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[console] ${page.url()} ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${page.url()} ${e.message}`));
  return page;
}

async function noOverflow(page, label) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  assert(sw <= cw, `${label}: horizontal overflow (${sw} > ${cw})`);
}

// Text cut off with "…" hides information (long translations, long titles): it must wrap instead.
async function noCutText(page, label) {
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => (el.offsetParent || getComputedStyle(el).position === "fixed") && el.innerText.trim() && getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.innerText.trim().slice(0, 40)),
  );
  assert(cut.length === 0, `${label}: text cut off: ${cut.join(" | ")}`);
}

async function shot(page, name) {
  step += 1;
  await page.screenshot({ path: path.join(SHOTS, `${String(step).padStart(2, "0")}-${name}.png`), fullPage: true });
}

function log(msg) {
  console.log(`  ✓ ${msg}`);
}

try {
  /* ---------------- 1. Signup → upload → analysis → paywall → buy → unlock ---------------- */
  const page = await newPage();
  await page.goto(BASE);
  await page.getByRole("heading", { name: /Forstå dit håndværkertilbud/ }).waitFor();
  await shot(page, "landing");
  assert((await page.innerText("body")).includes("Kan jeg opsige Pro?"), "outside the beta the FAQ explains cancelling Pro");
  log("landing page");

  // Visitors on a phone can go straight to a feature from the top menu: sign up, then land on it.
  const visitor = await newPage(390, 844);
  await visitor.goto(BASE);
  await visitor.locator("header nav").getByRole("link", { name: "Sammenlign" }).click();
  await visitor.waitForURL(/\/opret\?next=%2Fdashboard%2Fsammenlign/);
  await visitor.fill("#name", "Ny Besøgende");
  await visitor.fill("#email", `visitor${Date.now()}@eksempel.dk`);
  await visitor.fill("#password", "Ny-Besoegende-Kode-31");
  await visitor.check("input[name=acceptTerms]");
  await visitor.click("button[type=submit]");
  await visitor.waitForURL(`${BASE}/dashboard/sammenlign`);
  await visitor.close();
  log("public top menu (mobile) leads to the feature after signup");

  const email = `test${Date.now()}@eksempel.dk`;
  await page.goto(`${BASE}/opret`);
  await page.fill("#name", "Test Testesen");
  await page.fill("#email", email);
  await page.fill("#password", "kort");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.getByText("Adgangskoden skal være mindst 10 tegn.").waitFor();
  log("weak password rejected");
  await page.fill("#password", "Hemmelig-Kode-2026");
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/dashboard`);
  await page.getByText("Upload dit første tilbud").waitFor();
  log("signup → empty dashboard");

  await page.goto(`${BASE}/dashboard/upload`);
  const dk = await page.locator("[data-testid=danish-only]").innerText();
  if (!/danske regler/.test(dk) || !/andet land/.test(dk)) throw new Error("upload page must say analyses follow Danish rules: " + dk);
  await page.setInputFiles("[data-testid=file-input]", "sample-quotes/eksempel-vvs-badevaerelse.pdf");
  await page.fill("#project", "Nyt badeværelse");
  await page.click("button[type=submit]");
  await page.getByText("Vi gennemgår dit tilbud").waitFor();
  await shot(page, "scanning");
  await page.waitForURL(/\/dashboard\/tilbud\//, { timeout: 60_000 });
  await page.getByRole("heading", { name: "Renovering af badeværelse" }).waitFor();
  await page.getByText("Det skal du være opmærksom på").waitFor();
  // Demo analyses must never pass for a real review of the user's quote.
  await page.locator("[data-testid=demo-notice]").getByText("Eksempel – ikke en analyse af dit tilbud").waitFor();
  assert((await page.locator("[data-testid=cpr-hidden]").count()) === 0, "no CPR notice for a quote without a CPR number");
  const quoteUrl = page.url();
  log("upload → analysis page renders");

  const scoreText = await page.locator("text=Tilbudsscore 36 ud af 100").count();
  assert(scoreText > 0, "score 36 shown");
  await page.getByText("7 spørgsmål mere", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Se hele analysen" }).waitFor();
  // The paid details must not be in the page at all (not just blurred)
  const lockedHtml = await page.content();
  assert(!lockedHtml.includes("tilbuddets største enkeltpost"), "locked flag explanation is not sent to the browser");
  assert(!lockedHtml.includes("36.250"), "locked extra-cost amount is not sent to the browser");
  const apiJson = await page.evaluate(async (u) => (await fetch(`/api/quotes/${u.split("/").pop()}`)).text(), page.url());
  assert(!apiJson.includes("tilbuddets største enkeltpost"), "API does not leak locked details");
  log("locked details never reach the browser (page + API)");
  const visibleQuestions = await page.locator("section:has(h2:has-text('Spørgsmål til håndværkeren')) ol > li").count();
  assert(visibleQuestions === 1, `free user sees 1 question (saw ${visibleQuestions})`);
  await shot(page, "analysis-free");
  log("free user sees preview with locked details");

  // The free analysis is used up → upload shows paywall
  await page.goto(`${BASE}/dashboard/upload`);
  await page.getByText("Du har brugt din gratis analyse").waitFor();
  log("upload paywall when no analyses left");

  // Buy single analysis from the quote page → unlocks this quote
  await page.goto(quoteUrl);
  const buyBox = page.locator("section#laas-op");
  await buyBox.getByRole("button", { name: /Gå til betaling – 99 kr\./ }).click();
  await buyBox.getByText("Sæt flueben").waitFor();
  log("purchase requires consent to immediate delivery");
  await buyBox.getByRole("checkbox").nth(1).check();
  await buyBox.getByRole("button", { name: /Gå til betaling – 99 kr\./ }).click();
  await page.getByText("Skriv besked").waitFor({ timeout: 15_000 });
  const after = await page.locator("section:has(h2:has-text('Spørgsmål til håndværkeren')) ol > li").count();
  assert(after === 8, `all 8 questions after unlock (saw ${after})`);
  assert((await page.content()).includes("tilbuddets største enkeltpost"), "unlocked details are shown");
  await shot(page, "analysis-unlocked");
  log("single purchase unlocks the quote");

  await page.goto(`${BASE}/dashboard/konto`);
  await page.getByText("Engangskøb – 1 analyse").waitFor();
  await page.getByText("Testtilstand:").waitFor();
  log("payment history shows simulated purchase");
  await page.getByText("Brugt – kan ikke fortrydes").waitFor();
  log("used single purchase cannot be withdrawn");

  // Buy an extra analysis and withdraw it ("Fortryd købet").
  const buyOne = page.locator("div.w-full", { has: page.getByRole("button", { name: "Køb én analyse" }) });
  await buyOne.getByRole("checkbox").check();
  await buyOne.getByRole("button", { name: "Køb én analyse" }).click();
  await page.getByTestId("withdraw").waitFor({ timeout: 15_000 });
  // EU withdrawal function (from 19 June 2026): an unambiguous "withdraw" button, then a "confirm withdrawal" step.
  await page.getByRole("button", { name: "Fortryd aftalen her" }).click();
  await page.getByText(/Du får 99 kr\. tilbage/).waitFor();
  await page.getByRole("button", { name: "Bekræft fortrydelse" }).click();
  await page.getByText("Købet er fortrudt").waitFor();
  await page.getByText(/Fortrudt – 99 kr\. tilbagebetalt/).waitFor({ timeout: 10_000 });
  log("unused purchase can be withdrawn in the app with full refund");

  await page.goto(quoteUrl);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Slet" }).click();
  await page.waitForURL(`${BASE}/dashboard`);
  await page.getByText("Upload dit første tilbud").waitFor();
  log("delete with confirm");

  await page.goto(`${BASE}/dashboard/konto`);
  await page.getByRole("button", { name: "Slet min konto" }).click();
  await page.fill("#delpw", "Hemmelig-Kode-2026");
  await page.getByRole("button", { name: "Slet alt permanent" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "Hemmelig-Kode-2026");
  await page.click("button[type=submit]");
  await page.getByText("Forkert e-mail eller adgangskode.").waitFor();
  log("account deletion removes the account");

  /* ---------------- 1b. Partner code → gift analyses → compare unlocked quotes → 3-pakke → partial withdrawal ---------------- */
  // Needs PARTNER_CODES="E2E-PARTNER=1:2" (one use, two analyses) – set by scripts/test-all.sh.
  const buyer = await newPage();
  await buyer.goto(`${BASE}/opret?kode=E2E-PARTNER`);
  await buyer.getByTestId("code-note").waitFor();
  await buyer.fill("#name", "Kode Kodesen");
  await buyer.fill("#email", `kode${Date.now()}@eksempel.dk`);
  await buyer.fill("#password", "Kode-Kodesen-2026");
  await buyer.check("input[name=acceptTerms]");
  await buyer.click("button[type=submit]");
  await buyer.waitForURL(/\/dashboard\/konto\?kode=E2E-PARTNER$/);
  assert((await buyer.getByTestId("code-input").inputValue()) === "E2E-PARTNER", "code from the link is filled in");
  log("signup link with a code lands on the account page with the code filled in");
  await buyer.getByTestId("code-submit").click();
  await buyer.getByText("Koden er indløst. Du har fået 2 gratis analyser.").waitFor();
  await buyer.waitForURL(`${BASE}/dashboard/konto`);
  await buyer.getByText(/Ekstra analyser til gode: 2\./).waitFor();
  log("partner code gives 2 gift analyses");
  for (const [typed, msg] of [["e2e partner", "Du har allerede brugt den kode."], ["FINDES-IKKE", "Koden findes ikke. Tjek at den er skrevet rigtigt."]]) {
    await buyer.getByTestId("code-input").fill(typed);
    await buyer.getByTestId("code-submit").click();
    await buyer.getByText(msg).waitFor();
  }
  const double = await buyer.evaluate(async () => {
    const post = () => fetch("/api/codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2E-PARTNER" }) }).then((r) => r.status);
    return Promise.all([post(), post(), post()]);
  });
  assert(double.every((s) => s === 400), `parallel re-redeems are refused: ${double}`);
  await buyer.reload();
  await buyer.getByText(/Ekstra analyser til gode: 2\./).waitFor();
  log("a code can't be used twice, also with parallel requests; unknown codes are refused");

  const uploadAs = async (p, file) => {
    await p.goto(`${BASE}/dashboard/upload`);
    await p.setInputFiles("[data-testid=file-input]", `sample-quotes/${file}`);
    await p.fill("#project", "Badeværelse");
    await p.click("button[type=submit]");
    await p.waitForURL(/\/dashboard\/tilbud\//, { timeout: 60_000 });
    await p.getByText("Det skal du være opmærksom på").waitFor();
    return p.url();
  };
  const freeUrl = await uploadAs(buyer, "eksempel-byg.pdf");
  // The free analysis is locked; with gift analyses on the account, the page offers to unlock it with one.
  await buyer.getByRole("button", { name: "Lås tilbuddet op" }).waitFor();
  assert((await buyer.getByText("Skriv besked").count()) === 0, "the free analysis is locked");
  for (const f of ["eksempel-vinduer.pdf", "eksempel-vvs-badevaerelse.pdf"]) {
    await uploadAs(buyer, f);
    await buyer.getByText("Skriv besked").first().waitFor();
  }
  log("free analysis first, then the gift analyses – which are fully unlocked");

  await buyer.goto(`${BASE}/dashboard/sammenlign`);
  await buyer.getByText(/Skift tilbud \(2 valgt\)/).waitFor();
  assert((await buyer.getByText("Sammenligning kræver Pro").count()) === 0, "no paywall with 2 unlocked quotes");
  log("without Pro, the 2 unlocked quotes can be compared");

  await buyer.goto(`${BASE}/dashboard/konto`);
  const pack = buyer.getByTestId("pack3");
  await pack.getByRole("checkbox").check();
  await pack.getByRole("button", { name: "Køb 3-pakken" }).click();
  await buyer.getByText("3-pakke – 3 analyser").waitFor({ timeout: 15_000 });
  await buyer.getByText(/Ekstra analyser til gode: 3\./).waitFor();
  await buyer.goto(freeUrl);
  await buyer.getByRole("button", { name: "Lås tilbuddet op" }).click();
  await buyer.getByText("Skriv besked").first().waitFor({ timeout: 15_000 });
  log("3-pakke adds 3 analyses; one unlocks the free analysis");

  await buyer.goto(`${BASE}/dashboard/konto`);
  await buyer.getByTestId("withdraw").click();
  await buyer.getByText(/Du får 132,67 kr\. tilbage/).waitFor();
  await buyer.getByTestId("withdraw").click();
  await buyer.getByText("Købet er fortrudt").waitFor();
  await buyer.getByText(/Fortrudt – 132,67 kr\. tilbagebetalt/).waitFor({ timeout: 10_000 });
  assert((await buyer.getByText(/Ekstra analyser til gode/).count()) === 0, "the 2 unused analyses are removed");
  log("withdrawing a partly used 3-pakke refunds the 2 unused analyses (132,67 kr.)");
  await noOverflow(buyer, "konto with code + pack");
  await buyer.context().close();

  /* ---------------- 2. Demo user: compare + ask contractor ---------------- */
  const demo = await newPage();
  await demo.goto(`${BASE}/login`);
  await demo.fill("#email", "demo@klardal.dk");
  await demo.fill("#password", DEMO_PASSWORD);
  await demo.click("button[type=submit]");
  await demo.waitForURL(`${BASE}/dashboard`);
  await demo.getByRole("link", { name: /Sammenlign 3 tilbud/ }).click();
  await demo.waitForURL(/sammenlign\?ids=/);
  await demo.getByText("Det bør du vide").waitFor();
  await demo.getByText("Lavest værste scenarie").waitFor();
  await demo.getByText("Vores bud på bedste valg").waitFor();
  await demo.locator("[data-testid=best-disclaimer]").getByText(/ikke en vurdering af håndværkerens faglige kvalitet/).waitFor();
  await demo.getByRole("rowheader", { name: "Afstand fra dig" }).waitFor();
  const cols = await demo.locator("table thead th").count();
  assert(cols === 4, `comparison table has 3 quotes (+label col), saw ${cols - 1}`);
  await shot(demo, "compare");
  log("demo user compares 3 quotes");

  // Unclear VAT: the user picks, and the analysis, the overview and the comparison all follow the choice.
  await demo.goto(`${BASE}/dashboard`);
  await demo.getByRole("link", { name: /Eksempel Byg/ }).click();
  await demo.waitForURL(/tilbud\//);
  const vat = demo.locator("[data-testid=vat-choice]");
  await vat.getByText("Priserne er uden moms").waitFor();
  await vat.getByText("I alt 98.000 kr. med moms").waitFor();
  assert((await demo.getByRole("radio", { name: /^Priserne er uden moms/ }).getAttribute("aria-checked")) === "true", "assumed excl. VAT before choosing");
  await demo.getByRole("radio", { name: /^Priserne er med moms/ }).click();
  await demo.waitForFunction(() => document.querySelector("[aria-checked=true]")?.textContent?.includes("Dit valg"));
  const mainPrice = await demo.locator("[data-testid=price] dd").first().innerText();
  assert(mainPrice.includes("98.000 kr."), `analysis price follows the choice (${mainPrice})`);
  await demo.goto(`${BASE}/dashboard`);
  assert((await demo.getByRole("link", { name: /Eksempel Byg/ }).innerText()).includes("98.000 kr."), "overview price follows the choice");
  await demo.goto(`${BASE}/dashboard/sammenlign`);
  assert((await demo.locator("table").innerText()).includes("98.000 kr."), "comparison follows the choice");
  // Back to the default so the rest of the test sees the seeded numbers.
  await demo.goto(`${BASE}/dashboard`);
  await demo.getByRole("link", { name: /Eksempel Byg/ }).click();
  await demo.getByRole("radio", { name: /^Priserne er uden moms/ }).click();
  await demo.waitForFunction(() => document.querySelector("[aria-checked=true]")?.textContent?.includes("Dit valg"));
  log("unclear VAT: user choice is saved and used on analysis, overview and comparison");

  // A CPR number in a PDF is removed before the AI reads it, and the user is told.
  const cprDoc = await PDFDocument.create();
  const cprFont = await cprDoc.embedFont(StandardFonts.Helvetica);
  const cprPage = cprDoc.addPage();
  ["Tilbud: maling af stue", "Kunde: Jens Hansen, CPR 120385-1234", "Maling 18.500 kr."].forEach((l, i) => cprPage.drawText(l, { x: 50, y: 750 - i * 20, size: 12, font: cprFont }));
  await demo.goto(`${BASE}/dashboard/upload`);
  await demo.setInputFiles("[data-testid=file-input]", { name: "tilbud-maling.pdf", mimeType: "application/pdf", buffer: Buffer.from(await cprDoc.save()) });
  await demo.click("button[type=submit]");
  await demo.waitForURL(/\/dashboard\/tilbud\//, { timeout: 60_000 });
  const cprNotice = await demo.locator("[data-testid=cpr-hidden]").innerText();
  assert(cprNotice.includes("fandt et CPR-nummer") && !(await demo.content()).includes("120385"), `CPR notice shown and number never in the page (${cprNotice})`);
  await shot(demo, "cpr-hidden");
  const cprQuoteId = demo.url().split("/").pop();
  const del = await demo.evaluate(async (id) => (await fetch(`/api/quotes/${id}`, { method: "DELETE" })).status, cprQuoteId);
  assert(del === 200, `test quote deleted (${del})`);
  log("CPR number in a PDF is removed before the AI and the user is told");

  // Open Eksempel VVS quote and use "Spørg håndværkeren"
  await demo.goto(`${BASE}/dashboard`);
  await demo.getByRole("link", { name: /Eksempel VVS/ }).click();
  await demo.waitForURL(/tilbud\//);
  const countText = await demo.getByText(/Dine beskeder \(\d+\)/).textContent();
  const before = Number(countText.match(/\d+/)[0]);
  const flagTitle = "El-arbejdet afregnes efter forbrug";
  // Only the 3 most important findings are open; the rest sit behind "Vis alle N punkter".
  if (!(await demo.locator("article", { hasText: flagTitle }).isVisible())) await demo.getByText(/Vis alle \d+ punkter/).click();
  await demo
    .locator("article", { hasText: flagTitle })
    .getByRole("link", { name: "Spørg håndværkeren" })
    .click();
  await demo.waitForFunction((t) => document.querySelector("#topic")?.value === t, flagTitle);
  log("“Spørg håndværkeren” prefills the composer after mount");
  await demo.getByRole("radio", { name: "Bestemt" }).click();
  await demo.getByRole("button", { name: "Skriv besked" }).click();
  await demo.getByText(`Dine beskeder (${before + 1})`).waitFor({ timeout: 20_000 });
  const firstMsg = await demo.locator("article").filter({ hasText: "Før vi kan skrive under" }).count();
  assert(firstMsg > 0, "generated message uses the chosen tone");
  const msgText = await demo.locator("article").filter({ hasText: "Før vi kan skrive under" }).first().innerText();
  assert(!/\d{4}-\d{2}-\d{2}/.test(msgText) && /\d{1,2}\. \p{L}+ \d{4}/u.test(msgText), `message date is written out in Danish (${msgText.slice(0, 120)})`);
  await shot(demo, "message");
  log("message generated and saved");

  // Anonymous usage counts: copy the message and the questions, then the admin page shows every event.
  await demo.locator("article").filter({ hasText: "Før vi kan skrive under" }).first().getByRole("button", { name: "Kopiér" }).click();
  await demo.getByRole("button", { name: "Kopiér alle" }).click();
  await demo.waitForTimeout(500);
  const badEvent = (await demo.request.post(`${BASE}/api/events`, { headers: { origin: BASE }, data: { name: "analysis_done" } })).status();
  assert(badEvent === 400, `the browser can only report copy events (${badEvent})`);
  await demo.goto(`${BASE}/dashboard/sammenlign`);
  await demo.goto(`${BASE}/dashboard/admin`);
  const usage = await demo.locator("[data-testid=admin-totals]").innerText();
  for (const label of ["Analyse fuldført", "Sammenligning åbnet", "Besked genereret", "Besked kopieret", "Spørgsmål kopieret"]) {
    const row = usage.split("\n").find((l) => l.startsWith(label)) ?? "";
    assert(/\t[1-9]/.test(row), `admin shows "${label}" counted (${row})`);
  }
  log("anonymous usage counts reach the admin page");

  // Find contractors nearby (demo firms) and build a quote request
  await demo.goto(`${BASE}/dashboard/find`);
  await demo.selectOption("#trade", "vvs");
  await demo.fill("#postal", "4000");
  await demo.getByRole("button", { name: "Søg" }).click();
  await demo.getByText(/firma(er)? nær 4000 Roskilde/).waitFor();
  await demo.locator("ul li input[type=checkbox]").first().check();
  await demo.fill("#project", "Nyt badeværelse på 6 m².");
  await demo.getByText("En fast pris eller et bindende tilbud").waitFor();
  await shot(demo, "find");
  log("find contractors nearby + quote request");

  await demo.goto(`${BASE}/dashboard/konto`);
  await demo.getByRole("button", { name: "Opsig Pro" }).click();
  await demo.getByText(/Du beholder Pro til/).waitFor();
  await demo.getByRole("button", { name: "Ja, bekræft" }).click();
  await demo.getByText(/Opsagt\. Pro fortsætter til/).waitFor();
  await demo.getByRole("button", { name: "Genoptag Pro" }).click();
  await demo.getByRole("button", { name: "Opsig Pro" }).waitFor();
  log("cancel Pro keeps access to period end, and resume");
  await shot(demo, "account");
  log("account page");

  /* ---------------- 3. Mobile overflow check at 390px ---------------- */
  const mobile = await newPage(390, 844);
  const routesPublic = ["/", "/priser", "/login", "/opret", "/handelsbetingelser", "/privatlivspolitik", "/artikler", "/artikler/hvad-koster-et-nyt-badevaerelse", "/findes-ikke"];
  for (const r of routesPublic) {
    await mobile.goto(`${BASE}${r}`);
    await mobile.waitForLoadState("networkidle");
    await noOverflow(mobile, r);
    await noCutText(mobile, r);
  }
  await mobile.goto(`${BASE}/login`);
  await mobile.fill("#email", "demo@klardal.dk");
  await mobile.fill("#password", DEMO_PASSWORD);
  await mobile.click("button[type=submit]");
  await mobile.waitForURL(`${BASE}/dashboard`);
  const quoteHref = await mobile.getByRole("link", { name: /Eksempel Bad/ }).getAttribute("href");
  const routesApp = ["/dashboard", "/dashboard/upload", "/dashboard/sammenlign", "/dashboard/find", "/dashboard/konto", quoteHref];
  for (const r of routesApp) {
    await mobile.goto(`${BASE}${r}`);
    await mobile.waitForLoadState("networkidle");
    await noOverflow(mobile, r);
    await noCutText(mobile, r);
  }
  /* ---------------- Data isolation: another user can never reach the demo user's quote ---------------- */
  const otherQuoteId = quoteHref.split("/").pop();
  const intruder = await newPage();
  await intruder.goto(`${BASE}/opret`);
  await intruder.fill("#name", "Anden Bruger");
  await intruder.fill("#email", `intruder${Date.now()}@eksempel.dk`);
  await intruder.fill("#password", "Anden-Bruger-Kode-77");
  await intruder.check("input[name=acceptTerms]");
  await intruder.click("button[type=submit]");
  await intruder.waitForURL(`${BASE}/dashboard`);
  const adminProbe = await intruder.goto(`${BASE}/dashboard/admin`);
  assert(adminProbe.status() === 404, `usage numbers are hidden from other users (${adminProbe.status()})`);
  await intruder.goto(`${BASE}/dashboard`);
  const probes = await intruder.evaluate(async (id) => {
    const j = { "content-type": "application/json" };
    const r = async (url, init) => (await fetch(url, init)).status;
    return {
      get: await r(`/api/quotes/${id}`),
      file: await r(`/api/quotes/${id}/file`),
      retry: await r(`/api/quotes/${id}`, { method: "POST" }),
      message: await r(`/api/quotes/${id}/message`, { method: "POST", headers: j, body: JSON.stringify({ topic: "hej med dig" }) }),
      report: await r(`/api/quotes/${id}/report`, { method: "POST", headers: j, body: JSON.stringify({ message: "test test" }) }),
      unlock: await r(`/api/quotes/${id}/unlock`, { method: "POST" }),
      vat: await r(`/api/quotes/${id}/vat`, { method: "POST", headers: j, body: JSON.stringify({ choice: "incl" }) }),
      del: await r(`/api/quotes/${id}`, { method: "DELETE" }),
    };
  }, otherQuoteId);
  for (const [k, v] of Object.entries(probes)) assert(v === 404 || v === 403 || v === 402, `intruder ${k} must be denied, got ${v}`);
  const usedUp = await intruder.evaluate(async () => {
    const r = await fetch("/api/codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2E-PARTNER" }) });
    return { status: r.status, error: (await r.json()).error };
  });
  assert(usedUp.status === 400 && usedUp.error === "Koden er brugt op.", `a used-up code is refused for others: ${JSON.stringify(usedUp)}`);
  const page404 = await intruder.goto(`${BASE}${quoteHref}`);
  assert(page404.status() === 404, "quote page of another user is 404");
  await mobile.goto(`${BASE}${quoteHref}`);
  await mobile.waitForLoadState("networkidle");
  assert((await mobile.locator("h1").count()) > 0, "demo quote still exists after intruder attempts");
  log("another user cannot read, change, unlock, report or delete someone else's quote");

  // Two uploads at the same time with one analysis left: one succeeds, the other is refused cleanly.
  const race = await intruder.evaluate(async () => {
    const pdf = await (await fetch("/api/quotes")).json();
    const make = async () => {
      const fd = new FormData();
      fd.append("file", new Blob(["%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n%%EOF"], { type: "application/pdf" }), "tilbud.pdf");
      return (await fetch("/api/quotes", { method: "POST", body: fd })).status;
    };
    const statuses = await Promise.all([make(), make(), make()]);
    const list = await (await fetch("/api/quotes")).json();
    return { statuses, before: pdf.quotes.length, states: list.quotes.map((q) => q.status) };
  });
  assert(race.statuses.filter((s) => s === 201).length === 1, `exactly one parallel upload accepted (${race.statuses})`);
  assert(!race.states.some((st) => st === "PENDING" || st === "ANALYZING"), `no stuck quotes after parallel uploads (${race.states})`);
  log("parallel uploads never charge twice or leave stuck quotes");

  // Open redirect: a crafted ?next= must not send a freshly logged-in user to another site.
  await intruder.context().clearCookies();
  await intruder.goto(`${BASE}/login?next=${encodeURIComponent("/\\evil.example")}`);
  await intruder.fill("#email", "demo@klardal.dk");
  await intruder.fill("#password", DEMO_PASSWORD);
  await intruder.click("button[type=submit]");
  await intruder.waitForURL((u) => u.origin === new URL(BASE).origin && u.pathname.startsWith("/dashboard"));
  log("login ignores a crafted redirect to another site");

  // Forgot password: page works and an invalid reset link gives a clear error.
  await intruder.goto(`${BASE}/glemt-adgangskode`);
  const offline = intruder.locator("[data-testid=forgot-offline]");
  if (await offline.count()) {
    // No e-mail service configured: an honest message with the contact address, and no form that pretends to send.
    assert((await offline.locator("a[href^='mailto:']").count()) === 1, "forgot page offers the contact e-mail");
    assert((await intruder.getByRole("button", { name: "Send link" }).count()) === 0, "no send button without e-mail");
  } else {
    await intruder.fill("#email", "findes.ikke@eksempel.dk");
    await intruder.getByRole("button", { name: "Send link" }).click();
    await intruder.getByRole("status").waitFor();
  }
  await intruder.goto(`${BASE}/nulstil?token=ugyldig-token-ugyldig-token`);
  await intruder.fill("#password", "Ny-Adgangskode-2026");
  await intruder.getByRole("button", { name: "Gem ny adgangskode" }).click();
  await intruder.getByText("Linket er ugyldigt eller udløbet").waitFor();
  log("forgot/reset password flow handles unknown e-mails and invalid links");

  await mobile.goto(`${BASE}/`);
  await shot(mobile, "mobile-landing");
  await mobile.goto(`${BASE}${quoteHref}`);
  await shot(mobile, "mobile-quote");
  await mobile.goto(`${BASE}/dashboard/sammenlign`);
  await shot(mobile, "mobile-compare");
  log("no horizontal overflow at 390px on all pages");

  /* ---------------- 4. Languages ---------------- */
  // Browser language is picked up automatically (no cookie yet).
  const en = await newPage(1280, 900, "en-GB");
  await en.goto(BASE);
  assert((await en.getAttribute("html", "lang")) === "en", "English browser gets English UI");
  // The switcher stores the choice in a cookie and reloads.
  await en.locator("[data-testid=language-switcher]:visible").first().selectOption("de");
  let switched = false;
  for (let i = 0; i < 50 && !switched; i++) {
    switched = await en.evaluate(() => document.documentElement.lang === "de").catch(() => false);
    if (!switched) await en.waitForTimeout(200);
  }
  assert(switched, "language switcher changes the UI language");
  await en.waitForLoadState("networkidle");
  await shot(en, "landing-de");
  log("auto-detects browser language and switches via the selector");

  const LOCALES = ["en", "sv", "nb", "de", "pl", "uk", "ro"];
  const langPage = await newPage(390, 844);
  await langPage.goto(`${BASE}/login`);
  await langPage.fill("#email", "demo@klardal.dk");
  await langPage.fill("#password", DEMO_PASSWORD);
  await langPage.click("button[type=submit]");
  await langPage.waitForURL(`${BASE}/dashboard`);
  const host = new URL(BASE).hostname;
  for (const loc of LOCALES) {
    await langPage.context().addCookies([{ name: "ff_lang", value: loc, domain: host, path: "/" }]);
    for (const r of ["/", "/priser", "/handelsbetingelser", ...routesApp]) {
      await langPage.goto(`${BASE}${r}`);
      await langPage.waitForLoadState("networkidle");
      assert((await langPage.getAttribute("html", "lang")) === loc, `${loc} ${r}: html lang`);
      await noOverflow(langPage, `${loc} ${r}`);
      await noCutText(langPage, `${loc} ${r}`);
    }
    await langPage.goto(`${BASE}${quoteHref}`);
    await shot(langPage, `mobile-quote-${loc}`);
  }
  await langPage.context().addCookies([{ name: "ff_lang", value: "da", domain: host, path: "/" }]);
  log(`all pages render in ${LOCALES.length} more languages without overflow or cut-off text at 390px`);

  // Expected: the 404 page logs a 404 resource, the weak-password test and the wrong partner codes get deliberate 400s.
  const relevant = errors.filter((e) => !e.includes("/findes-ikke") && !(e.includes("/opret") && e.includes("status of 400")) && !(e.includes("/login") && e.includes("status of 401")) && !(e.includes("status of 404") || e.includes("status of 402")) && !(e.includes("/nulstil") && e.includes("status of 400")) && !((e.includes("/dashboard/konto") || e.includes(`${BASE}/dashboard `)) && e.includes("status of 400")));
  if (relevant.length) {
    console.error("\nConsole errors:\n" + relevant.join("\n"));
    process.exitCode = 1;
  } else {
    log("no console errors");
  }
} catch (err) {
  console.error(err);
  if (errors.length) console.error("\nConsole errors:\n" + errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
