/**
 * Fast unit tests for pure logic (no app, no database):  npx tsx scripts/unit.test.ts
 */
import assert from "node:assert/strict";
import { DEMO_QUOTES } from "../src/lib/demo-data";
import { analysisOfQuote, applyVatChoice, normalizeAnalysis, parseStoredAnalysis, priceOfQuote, scoreOfQuote } from "../src/lib/analysis";
import { computeScore, scoreBand, scoreLabel } from "../src/lib/score";
import { DICTS } from "../src/i18n/dict";
import { fmt } from "../src/i18n/fmt";
import { formatKr } from "../src/lib/format";
import { passwordProblem } from "../src/lib/password";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../src/lib/demo";
import { ARTICLES } from "../src/content/articles";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { unusedPurchases, withdrawalQuote } from "../src/lib/purchases";
import { normalizeCode, parsePartnerCodes } from "../src/lib/code-format";
import type { Payment } from "../src/db/schema";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

console.log("Unit tests");

test("score labels switch exactly at 40, 60 and 80", () => {
  const L = DICTS.da.score.labels;
  const cases: [number, string][] = [
    [0, L.veryUnclear], [39, L.veryUnclear], [40, L.unclear], [59, L.unclear],
    [60, L.fair], [79, L.fair], [80, L.transparent], [100, L.transparent],
  ];
  for (const [score, label] of cases) assert.equal(scoreLabel(score, DICTS.da.score), label, `score ${score}`);
});

test("good and bad labels are clearly different words in every language", () => {
  for (const [lang, d] of Object.entries(DICTS)) {
    const { transparent, veryUnclear } = d.score.labels;
    assert.notEqual(transparent, veryUnclear, lang);
    // "Meget klart" vs "Meget uklart" was easy to misread: the best label must not appear inside the worst.
    assert.ok(!veryUnclear.toLowerCase().includes(transparent.toLowerCase()), `${lang}: "${transparent}" inside "${veryUnclear}"`);
  }
});

test("every page gets the same score for a quote, even if the stored one is stale", () => {
  for (const demo of DEMO_QUOTES) {
    const normalized = normalizeAnalysis(demo.raw);
    const real = computeScore(normalized).total;
    // Simulate a quote saved before a change to the scoring rules.
    const stale = { ...normalized, score: { total: 999, label: "old", breakdown: [] } };
    const row = { analysisJson: JSON.stringify(stale), score: 999 };
    assert.equal(parseStoredAnalysis(row.analysisJson)?.score.total, real, demo.raw.title ?? "demo");
    assert.equal(scoreOfQuote(row), real);
  }
});

test("score without an analysis falls back to the stored number", () => {
  assert.equal(scoreOfQuote({ analysisJson: null, score: 42 }), 42);
  assert.equal(scoreOfQuote({ analysisJson: null, score: null }), null);
});

test("unclear VAT: the user's choice decides the price, everywhere", () => {
  const raw = structuredClone(DEMO_QUOTES[0].raw) as Record<string, unknown>;
  raw.totals = { exclVat: 100000, vat: null, inclVat: null };
  raw.lineItems = [{ description: "Arbejde", category: "Arbejdsløn", amount: 100000, clarity: "clear", explanation: "", quantity: 2, unit: "stk", unitPrice: 50000, note: null }];
  raw.documentCheck = { isQuote: true, readability: "good", unreadableNote: null, suspiciousInstructions: false, vatStated: "unclear" };
  const a = { ...normalizeAnalysis(raw), score: { total: 0, label: "", breakdown: [] } };
  assert.equal(a.totals.inclVat, 125000, "without a choice: read as excl. VAT");
  const excl = applyVatChoice(a, "excl");
  assert.deepEqual(excl.totals, { exclVat: 100000, vat: 25000, inclVat: 125000 });
  const incl = applyVatChoice(a, "incl");
  assert.deepEqual(incl.totals, { exclVat: 80000, vat: 20000, inclVat: 100000 });
  assert.equal(incl.lineItems[0].amount, 80000, "line items become excl. VAT");
  assert.equal(incl.lineItems[0].unitPrice, 40000);
  const row = { analysisJson: JSON.stringify(a), vatChoice: "incl" as const, totalInclVat: 125000 };
  assert.equal(priceOfQuote(row), 100000, "lists use the choice");
  assert.equal(analysisOfQuote(row)?.totals.inclVat, 100000);
});

test("stated VAT: a choice is ignored", () => {
  const raw = structuredClone(DEMO_QUOTES[0].raw) as Record<string, unknown>;
  raw.totals = { exclVat: 100000, vat: 25000, inclVat: 125000 };
  raw.documentCheck = { isQuote: true, readability: "good", unreadableNote: null, suspiciousInstructions: false, vatStated: "excl" };
  const a = { ...normalizeAnalysis(raw), score: { total: 0, label: "", breakdown: [] } };
  assert.equal(applyVatChoice(a, "incl").totals.inclVat, 125000);
});

test("quote stating only an incl.-VAT total keeps the written amount as the incl. price", () => {
  const raw = structuredClone(DEMO_QUOTES[0].raw) as Record<string, unknown>;
  raw.totals = { exclVat: null, vat: null, inclVat: 100000 };
  raw.documentCheck = { isQuote: true, readability: "good", unreadableNote: null, suspiciousInstructions: false, vatStated: "unclear" };
  const a = { ...normalizeAnalysis(raw), score: { total: 0, label: "", breakdown: [] } };
  assert.equal(a.vatBasis?.assumed, "incl");
  assert.equal(applyVatChoice(a, "incl").totals.inclVat, 100000);
  assert.equal(applyVatChoice(a, "excl").totals.inclVat, 125000);
});

test("no double full stop when an amount ends a sentence", () => {
  assert.equal(fmt("ender på {w}. Den laveste", { w: formatKr(169750) }), "ender på 169.750 kr. Den laveste");
  assert.equal(fmt("Pris {p}.", { p: "100 kr." }), "Pris 100 kr.");
  assert.equal(fmt("Pris {p}.", { p: 100 }), "Pris 100.");
  assert.equal(fmt("{a}.{b}", { a: "x", b: "y" }), "x.y");
  assert.equal(fmt("Ukendt {x}.", {}), "Ukendt {x}.");
  // Every compare insight in every language, filled with amounts ending in "kr.", has no "..".
  for (const [lang, d] of Object.entries(DICTS)) {
    for (const [k, tpl] of Object.entries(d.compare.insight)) {
      const out = fmt(tpl, new Proxy({}, { has: () => true, get: () => formatKr(169750) }) as Record<string, string>);
      assert.ok(!out.includes(".."), `${lang}.compare.insight.${k}: ${out}`);
    }
  }
});

test("the demo account's password follows the same rules as everyone's", () => {
  assert.equal(passwordProblem(DEMO_PASSWORD, DEMO_EMAIL), null);
  assert.notEqual(passwordProblem("demo1234", DEMO_EMAIL), null, "the old 8-character password is rejected");
});

test("verdict sentence and label always come from the same score band", () => {
  for (const [lang, d] of Object.entries(DICTS)) {
    for (const score of [0, 39, 40, 59, 60, 79, 80, 100]) {
      const band = scoreBand(score);
      assert.equal(scoreLabel(score, d.score), d.score.labels[band], `${lang} ${score}`);
      assert.ok(d.quote.verdict[band].length > 10, `${lang} verdict for ${band}`);
    }
  }
});

test("home 'what you get' has the same five points with a title and a text in every language", () => {
  for (const [lang, d] of Object.entries(DICTS)) {
    assert.equal(d.home.features.length, 5, lang);
    for (const f of d.home.features) assert.ok(f.title.length > 5 && f.text.length > 10, `${lang}: ${f.title}`);
  }
});

test("React hydration fix applies to Next's bundled React, stays valid JS and refuses changed code", () => {
  const loader = createRequire(import.meta.url)("./react-hydration-fix-loader.cjs");
  for (const file of ["production", "development"]) {
    const src = readFileSync(new URL(`../node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.${file}.js`, import.meta.url), "utf8");
    const out: string = loader.call({ resourcePath: file }, src);
    assert.ok(out.includes("klardal: react 19.3 hydration replay fix"), `${file}: patched`);
    assert.ok(/popToNextHostParent\((\w+)\),\s*5 === \1\.tag/.test(out), `${file}: resets the hydration position`);
    assert.equal(loader.call({ resourcePath: file }, out), out, `${file}: applying twice changes nothing`);
    new Function(out); // throws on a syntax error
  }
  assert.throws(() => loader.call({ resourcePath: "x" }, "function replaySuspendedUnitOfWork(a) {}"), /review the patch/);
});

const pay = (id: string, kind: Payment["kind"], amountDkk: number, daysAgo: number, extra: Partial<Payment> = {}): Payment => ({
  id, userId: "u", kind, amountDkk, provider: "stripe", reference: id, consentAt: null, consentText: null,
  paymentIntent: null, renewal: false, refundedAt: null, refundedOere: null,
  createdAt: new Date(Date.now() - daysAgo * 86400000), ...extra,
});

test("unused purchases: the newest purchases count as unused, a pack can be partly used", () => {
  const all = [pay("old", "SINGLE", 99, 5), pay("pack", "PACK3", 199, 3), pay("new", "SINGLE", 99, 1)];
  assert.deepEqual([...unusedPurchases({ extraCredits: 5 }, all)], [["new", 1], ["pack", 3], ["old", 1]]);
  assert.deepEqual([...unusedPurchases({ extraCredits: 3 }, all)], [["new", 1], ["pack", 2]]);
  assert.deepEqual([...unusedPurchases({ extraCredits: 0 }, all)], []);
  assert.deepEqual([...unusedPurchases({ extraCredits: -2 }, all)], [], "never negative");
  const refunded = [pay("pack", "PACK3", 199, 3, { refundedAt: new Date() }), pay("s", "SINGLE", 99, 2)];
  assert.deepEqual([...unusedPurchases({ extraCredits: 1 }, refunded)], [["s", 1]], "refunded purchases are skipped");
  assert.deepEqual([...unusedPurchases({ extraCredits: 3 }, [pay("pro", "PRO_MONTHLY", 49, 1)])], [], "Pro has no credits");
});

test("withdrawal: a pack refunds its unused analyses pro rata, a used one can't be withdrawn", () => {
  const pack = pay("pack", "PACK3", 199, 2);
  assert.deepEqual(withdrawalQuote(pack, new Map([["pack", 3]])), { refundOere: 19900, credits: 3 });
  assert.deepEqual(withdrawalQuote(pack, new Map([["pack", 2]])), { refundOere: 13267, credits: 2 });
  assert.deepEqual(withdrawalQuote(pack, new Map([["pack", 1]])), { refundOere: 6633, credits: 1 });
  assert.deepEqual(withdrawalQuote(pack, new Map()), { reason: "withdrawUsed" });
  assert.deepEqual(withdrawalQuote(pay("p", "PACK3", 199, 15), new Map([["p", 3]])), { reason: "withdrawExpired" });
  assert.deepEqual(withdrawalQuote(pay("s", "SINGLE", 99, 1), new Map([["s", 1]])), { refundOere: 9900, credits: 1 });
  const pro = withdrawalQuote(pay("pro", "PRO_MONTHLY", 49, 0.5), new Map());
  assert.ok("refundOere" in pro && pro.refundOere === 4900 - Math.round(4900 / 30), "Pro: pays for each started day");
});

test("partner codes: typed codes are normalized, bad entries in PARTNER_CODES are skipped", () => {
  assert.equal(normalizeCode(" maegler-svb 2026 "), "MAEGLERSVB2026");
  assert.equal(normalizeCode("æøå"), "");
  assert.deepEqual(parsePartnerCodes("Maegler-SVB=50, ENERGI=20:2,bad,X=5,NUL=0,BIG=999999,TOOMANY=5:11, ENERGI=30"), [
    { code: "MAEGLERSVB", maxUses: 50, credits: 1 },
    { code: "ENERGI", maxUses: 30, credits: 1 },
  ]);
  assert.deepEqual(parsePartnerCodes(undefined), []);
  assert.deepEqual(parsePartnerCodes(""), []);
});

test("new texts exist in every language: 3-pakke, codes and their errors", () => {
  for (const [lang, d] of Object.entries(DICTS)) {
    assert.equal(d.plans.pack.features.length, 4, lang);
    for (const v of [d.checkout.consentPack, d.code.title, d.code.button, d.errors.codeInvalid, d.errors.codeUsedUp, d.errors.codeAlreadyUsed, d.errors.codeBeta])
      assert.ok(v.length > 2, lang);
    assert.ok(d.code.doneOther.includes("{n}") && d.code.doneOne.includes("{n}"), `${lang}: code count`);
    assert.ok(d.lang.legalSummary[0].includes("199"), `${lang}: legal summary names the 3-pakke price`);
  }
});

test("Klardal's own prices never claim VAT (Klardal is not VAT-registered)", () => {
  const vat = /moms|\bVAT\b|MwSt|Mehrwertsteuer|\bmva\b|merverdiavgift|\bTVA\b|ПДВ/i;
  for (const [lang, d] of Object.entries(DICTS))
    for (const v of [d.lang.legalSummary[0], d.home.pricingText, d.pricingPage.note, d.checkout.consentPro])
      assert.ok(!vat.test(v), `${lang}: ${v}`);
});

test("articles: unique URL-safe slugs, search-friendly title and description lengths, valid dates", () => {
  assert.equal(new Set(ARTICLES.map((a) => a.slug)).size, ARTICLES.length);
  for (const a of ARTICLES) {
    assert.match(a.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, a.slug);
    assert.ok(a.title.length <= 60, `${a.slug}: title ${a.title.length} chars`);
    assert.ok(a.description.length >= 50 && a.description.length <= 160, `${a.slug}: description ${a.description.length} chars`);
    for (const d of [a.published, a.updated]) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)), `${a.slug}: ${d}`);
    assert.ok(a.updated >= a.published, `${a.slug}: updated before published`);
    assert.ok(a.draft || !/PLADSHOLDER/.test(JSON.stringify(a)), `${a.slug}: placeholder text in a published article`);
  }
});

console.log(`\n${passed} tests passed`);
