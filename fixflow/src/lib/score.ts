import type { QuoteAnalysis, ScoreResult } from "./analysis";
import { da, type Dict } from "@/i18n/dict/da";
import { fmt } from "@/i18n/fmt";

type Input = Pick<QuoteAnalysis, "lineItems" | "checks" | "priceType" | "flags">;
type ScoreTexts = Dict["score"];

export function scoreLabel(score: number, t: ScoreTexts = da.score): string {
  if (score >= 80) return t.labels.transparent;
  if (score >= 60) return t.labels.fair;
  if (score >= 40) return t.labels.unclear;
  return t.labels.veryUnclear;
}

/**
 * Deterministic Tilbudsscore (0–100). Computed in code, never by the AI.
 * The texts argument only changes the wording (language) – never the points.
 */
export function computeScore(a: Input, t: ScoreTexts = da.score): ScoreResult {
  // 1. Specificering (30)
  const weights = { clear: 1, vague: 0.5, unclear: 0 } as const;
  const total = a.lineItems.reduce((s, i) => s + Math.max(0, i.amount), 0);
  const weighted = a.lineItems.reduce((s, i) => s + Math.max(0, i.amount) * weights[i.clarity], 0);
  const specShare = total > 0 ? weighted / total : 0;
  const spec = Math.round(specShare * 30);
  const unclearPct = Math.round((1 - specShare) * 100);

  // 2. Fuldstændighed (30)
  const present = a.checks.filter((c) => c.present).length;
  const complete = Math.round((present / 10) * 30);
  const missing = 10 - present;

  // 3. Prisform & vilkår (20)
  const base = { fast_pris: 20, tilbud: 16, overslag: 9, uklart: 4 }[a.priceType];
  const termsFlags = a.flags.filter((f) => f.type === "terms").length;
  const terms = Math.max(0, base - termsFlags * 3);

  // 4. Risiko for ekstraudgifter (20)
  const penalty = { high: 6, medium: 3, low: 1 } as const;
  const riskFlags = a.flags.filter((f) => f.type !== "terms");
  const risk = Math.max(0, 20 - riskFlags.reduce((s, f) => s + penalty[f.severity], 0));

  const priceHint = t.priceHint[a.priceType];
  const breakdown = [
    {
      key: "spec",
      label: t.spec,
      points: spec,
      max: 30,
      hint: unclearPct <= 5 ? t.specAllClear : fmt(t.specUnclear, { pct: unclearPct }),
    },
    {
      key: "complete",
      label: t.complete,
      points: complete,
      max: 30,
      hint: missing === 0 ? t.completeAll : fmt(t.completeSome, { present, missing }),
    },
    {
      key: "terms",
      label: t.terms,
      points: terms,
      max: 20,
      hint: termsFlags > 0 ? `${priceHint} ${fmt(t.termsFlags, { n: termsFlags })}` : priceHint,
    },
    {
      key: "risk",
      label: t.risk,
      points: risk,
      max: 20,
      hint: riskFlags.length === 0 ? t.riskNone : fmt(t.riskSome, { n: riskFlags.length }),
    },
  ];

  const sum = Math.max(0, Math.min(100, spec + complete + terms + risk));
  return { total: sum, label: scoreLabel(sum, t), breakdown };
}
