/**
 * Fast unit tests for pure logic (no app, no database):  npx tsx scripts/unit.test.ts
 */
import assert from "node:assert/strict";
import { DEMO_QUOTES } from "../src/lib/demo-data";
import { analysisOfQuote, applyVatChoice, normalizeAnalysis, parseStoredAnalysis, priceOfQuote, scoreOfQuote } from "../src/lib/analysis";
import { computeScore, scoreLabel } from "../src/lib/score";
import { DICTS } from "../src/i18n/dict";

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

console.log(`\n${passed} tests passed`);
