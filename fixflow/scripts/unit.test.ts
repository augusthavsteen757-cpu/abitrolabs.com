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

console.log(`\n${passed} tests passed`);
