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

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SCREENSHOT_DIR || "screenshots";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
let step = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function newPage(width = 1280, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height }, permissions: ["clipboard-read", "clipboard-write"] });
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
  log("landing page");

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
  await page.setInputFiles("[data-testid=file-input]", "sample-quotes/hansen-soen-badevaerelse.pdf");
  await page.fill("#project", "Nyt badeværelse");
  await page.click("button[type=submit]");
  await page.getByText("Vi gennemgår dit tilbud").waitFor();
  await shot(page, "scanning");
  await page.waitForURL(/\/dashboard\/tilbud\//, { timeout: 60_000 });
  await page.getByRole("heading", { name: "Renovering af badeværelse" }).waitFor();
  await page.getByText("Det skal du være opmærksom på").waitFor();
  const quoteUrl = page.url();
  log("upload → analysis page renders");

  const scoreText = await page.locator("text=Tilbudsscore 36 ud af 100").count();
  assert(scoreText > 0, "score 36 shown");
  await page.getByText("5 spørgsmål mere").waitFor();
  await page.getByText("Beskedgeneratoren er en del af Pro").waitFor();
  const visibleQuestions = await page.locator("section:has(h2:has-text('Spørgsmål til håndværkeren')) ol > li").count();
  assert(visibleQuestions === 3, `free user sees 3 questions (saw ${visibleQuestions})`);
  await shot(page, "analysis-free");
  log("free user sees paywall + 3 questions");

  // The free analysis is used up → upload shows paywall
  await page.goto(`${BASE}/dashboard/upload`);
  await page.getByText("Du har brugt din gratis analyse").waitFor();
  log("upload paywall when no analyses left");

  // Buy single analysis from the quote page → unlocks this quote
  await page.goto(quoteUrl);
  const buyBox = page.locator("section#besked");
  await buyBox.getByRole("button", { name: /Køb – 99 kr\./ }).click();
  await buyBox.getByText("Sæt flueben").waitFor();
  log("purchase requires consent to immediate delivery");
  await buyBox.getByRole("checkbox").nth(1).check();
  await buyBox.getByRole("button", { name: /Køb – 99 kr\./ }).click();
  await page.getByText("Skriv besked").waitFor({ timeout: 15_000 });
  const after = await page.locator("section:has(h2:has-text('Spørgsmål til håndværkeren')) ol > li").count();
  assert(after === 8, `all 8 questions after unlock (saw ${after})`);
  await shot(page, "analysis-unlocked");
  log("single purchase unlocks the quote");

  await page.goto(`${BASE}/dashboard/konto`);
  await page.getByText("Engangskøb – 1 analyse").waitFor();
  await page.getByText("Testtilstand:").waitFor();
  log("payment history shows simulated purchase");

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

  /* ---------------- 2. Demo user: compare + ask contractor ---------------- */
  const demo = await newPage();
  await demo.goto(`${BASE}/login`);
  await demo.fill("#email", "demo@fixflow.dk");
  await demo.fill("#password", "demo1234");
  await demo.click("button[type=submit]");
  await demo.waitForURL(`${BASE}/dashboard`);
  await demo.getByRole("link", { name: /Sammenlign 3 tilbud/ }).click();
  await demo.waitForURL(/sammenlign\?ids=/);
  await demo.getByText("Det bør du vide").waitFor();
  await demo.getByText("Lavest værste scenarie").waitFor();
  await demo.getByText("Bedste samlede match").waitFor();
  await demo.getByRole("rowheader", { name: "Afstand fra dig" }).waitFor();
  const cols = await demo.locator("table thead th").count();
  assert(cols === 4, `comparison table has 3 quotes (+label col), saw ${cols - 1}`);
  await shot(demo, "compare");
  log("demo user compares 3 quotes");

  // Open Hansen quote and use "Spørg håndværkeren"
  await demo.goto(`${BASE}/dashboard`);
  await demo.getByRole("link", { name: /Hansen & Søn/ }).click();
  await demo.waitForURL(/tilbud\//);
  const countText = await demo.getByText(/Dine beskeder \(\d+\)/).textContent();
  const before = Number(countText.match(/\d+/)[0]);
  const flagTitle = "El-arbejdet afregnes efter forbrug";
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
  await shot(demo, "message");
  log("message generated and saved");

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
  const routesPublic = ["/", "/priser", "/login", "/opret", "/handelsbetingelser", "/privatlivspolitik", "/findes-ikke"];
  for (const r of routesPublic) {
    await mobile.goto(`${BASE}${r}`);
    await mobile.waitForLoadState("networkidle");
    await noOverflow(mobile, r);
  }
  await mobile.goto(`${BASE}/login`);
  await mobile.fill("#email", "demo@fixflow.dk");
  await mobile.fill("#password", "demo1234");
  await mobile.click("button[type=submit]");
  await mobile.waitForURL(`${BASE}/dashboard`);
  const quoteHref = await mobile.getByRole("link", { name: /Nordvest/ }).getAttribute("href");
  const routesApp = ["/dashboard", "/dashboard/upload", "/dashboard/sammenlign", "/dashboard/find", "/dashboard/konto", quoteHref];
  for (const r of routesApp) {
    await mobile.goto(`${BASE}${r}`);
    await mobile.waitForLoadState("networkidle");
    await noOverflow(mobile, r);
  }
  await mobile.goto(`${BASE}/`);
  await shot(mobile, "mobile-landing");
  await mobile.goto(`${BASE}${quoteHref}`);
  await shot(mobile, "mobile-quote");
  await mobile.goto(`${BASE}/dashboard/sammenlign`);
  await shot(mobile, "mobile-compare");
  log("no horizontal overflow at 390px on all pages");

  // Expected: the 404 page logs a 404 resource, and the weak-password test gets a deliberate 400.
  const relevant = errors.filter((e) => !e.includes("/findes-ikke") && !(e.includes("/opret") && e.includes("status of 400")) && !(e.includes("/login") && e.includes("status of 401")));
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
