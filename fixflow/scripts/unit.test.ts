/**
 * Fast unit tests for pure logic (no app, no database):  npx tsx scripts/unit.test.ts
 */
import assert from "node:assert/strict";
import { DEMO_QUOTES } from "../src/lib/demo-data";
import { normalizeAnalysis, parseStoredAnalysis, scoreOfQuote } from "../src/lib/analysis";
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

console.log(`\n${passed} tests passed`);
