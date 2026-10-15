/**
 * Beta mode (BETA_FREE=1) – the mode that runs on klardal.com: free, capped, nothing can be bought.
 *   BETA_FREE=1 ALLOW_LOCAL_DB=1 ALLOW_DEMO_MODE=1 npm start
 *   BASE_URL=http://localhost:3000 CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/beta.mjs
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
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
ok(/0 kr\.[\s\S]*Gratis nu[\s\S]*Efter prøveperioden: 49 kr\.[\s\S]*Efter prøveperioden: 99 kr\./.test(plansText), "pricing page: both plans free now, with the later price stated");
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
// The invoice check uses the same analyses: with none left the form says so and the API refuses it.
const lastQuote = await p.evaluate(async () => (await (await fetch("/api/quotes")).json()).quotes[0].id);
await p.goto(B + `/dashboard/tilbud/${lastQuote}`);
const invForm = await p.getByTestId("invoice-form").innerText();
ok(invForm.includes("Du har ikke flere analyser tilbage") && (await p.getByTestId("invoice-form").getByRole("button", { name: "Tjek regningen" }).isDisabled()), "invoice check: no analyses left is said plainly, button disabled");
const invExtra = await p.evaluate(async (id) => { const f = new FormData(); f.append("file", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "regning.pdf"); return (await fetch(`/api/quotes/${id}/invoice`, { method: "POST", body: f })).status; }, lastQuote);
ok(invExtra === 402, `invoice check refused by the API when no analyses are left (${invExtra})`);
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

/* Tjek regningen in the beta: costs one of the free analyses, refunded when the document isn't an invoice,
   a double click runs only one check, and checks can be deleted. */
{
  const pdfOf = async (lines) => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pg = doc.addPage();
    lines.forEach((l, i) => pg.drawText(l, { x: 50, y: 750 - i * 20, size: 12, font }));
    return [...(await doc.save())];
  };
  const inv = await (await br.newContext({ locale: "da-DK" })).newPage();
  inv.on("pageerror", (e) => errs.push(e.message));
  await inv.goto(B + "/opret");
  await inv.fill("#name", "Regning Tester"); await inv.fill("#email", `regning${Date.now()}@eksempel.dk`); await inv.fill("#password", "Regning-Tester-Kode-55");
  await inv.locator("input[type=checkbox]").first().check();
  await inv.click("button[type=submit]"); await inv.waitForURL(B + "/dashboard");
  const r = await inv.evaluate(async ({ quotePdf, invoice, letter }) => {
    const send = async (url, name, bytes) => {
      const fd = new FormData();
      fd.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), name);
      const res = await fetch(url, { method: "POST", body: fd });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    };
    const q = await send("/api/quotes", "tilbud-vvs.pdf", quotePdf);
    const id = q.body.quote?.id;
    const url = `/api/quotes/${id}/invoice`;
    const notInvoice = await send(url, "ikke-regning.pdf", letter);
    const first = await send(url, "slutregning.pdf", invoice);
    const parallel = (await Promise.all([send(url, "regning-a.pdf", invoice), send(url, "regning-b.pdf", invoice)])).map((x) => x.status).sort();
    const noneLeft = await send(url, "regning-c.pdf", invoice);
    const list = await (await fetch(url)).json();
    const del = (await fetch(`${url}/${list.checks[0].id}`, { method: "DELETE" })).status;
    const delAgain = (await fetch(`${url}/${list.checks[0].id}`, { method: "DELETE" })).status;
    const after = (await (await fetch(url)).json()).checks.length;
    return { id, quote: q.status, notInvoice, first: first.status, result: first.body.check?.result, parallel, noneLeft: noneLeft.status, count: list.checks.length, raw: JSON.stringify(list), del, delAgain, after };
  }, { quotePdf: [...readFileSync(new URL("../sample-quotes/eksempel-vvs-badevaerelse.pdf", import.meta.url))], invoice: await pdfOf(["Faktura 2001", "Slutregning", "I alt 52.000 kr."]), letter: await pdfOf(["Kære nabo", "Husk grillfesten lørdag"]) });
  ok(r.quote === 201, `beta: quote analysed (${r.quote})`);
  ok(r.notInvoice.status === 422 && /ligner ikke en regning/.test(r.notInvoice.body.error ?? ""), `beta: a document that isn't an invoice is refused (${r.notInvoice.status})`);
  ok(r.first === 201 && r.result?.differenceInclVat > 0 && r.result.items.some((i) => i.status === "new"), `beta: invoice compared with the quote (${r.first})`);
  ok(r.parallel.join() === "201,409", `beta: a double click runs only one check (${r.parallel})`);
  // 3 free analyses: 1 quote + 2 checks. The refused document was refunded, otherwise one of these would have been 402.
  ok(r.noneLeft === 402, `beta: the refused document was not charged, and the 3 free analyses are now used (${r.noneLeft})`);
  ok(r.count === 2 && !/fileKey|aiModel|aiInputTokens/.test(r.raw), "beta: only results are stored and sent, no file key or AI cost data");
  ok(r.del === 200 && r.delAgain === 404 && r.after === 1, `beta: an invoice check can be deleted once (${r.del}, ${r.delAgain}, ${r.after})`);
  await inv.goto(B + `/dashboard/tilbud/${r.id}`);
  const page = await inv.innerText("#regning");
  ok(page.includes("Er regningen kommet?") && page.includes("ikke juridisk rådgivning") && page.includes("Du har ikke flere analyser tilbage"), "beta: the quote page shows the check, the disclaimer and that no analyses are left");
  const other = (await inv.evaluate(async () => (await fetch("/api/quotes/xyz/invoice")).status));
  ok(other === 404, `beta: an unknown quote has no invoice checks (${other})`);
  const gone = await inv.evaluate(async (id) => {
    await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    return (await fetch(`/api/quotes/${id}/invoice`)).status;
  }, r.id);
  ok(gone === 404, `beta: a deleted quote has no invoice checks left to show (${gone})`);
}

ok(errs.length === 0, "no page errors " + errs.join(";"));
await br.close();
