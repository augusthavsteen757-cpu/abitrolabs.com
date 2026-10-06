import type { QuoteAnalysis, ScoreResult } from "./analysis";

type Input = Pick<QuoteAnalysis, "lineItems" | "checks" | "priceType" | "flags">;

export function scoreLabel(score: number): string {
  if (score >= 80) return "Gennemsigtigt";
  if (score >= 60) return "Rimeligt klart";
  if (score >= 40) return "Uklart";
  return "Meget uklart";
}

/** Deterministic Tilbudsscore (0–100). Computed in code, never by the AI. */
export function computeScore(a: Input): ScoreResult {
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

  const priceHint = {
    fast_pris: "Fast pris giver den største sikkerhed for, hvad det ender med at koste.",
    tilbud: "Et tilbud er bindende, men tjek hvad der står med småt om forbehold.",
    overslag: "Et overslag er ikke bindende – prisen må normalt overskrides med op til 10–15 %.",
    uklart: "Det fremgår ikke tydeligt, om prisen er fast, et tilbud eller et overslag.",
  }[a.priceType];

  const breakdown = [
    {
      key: "spec",
      label: "Specificering",
      points: spec,
      max: 30,
      hint:
        unclearPct <= 5
          ? "Næsten alle poster er tydeligt beskrevet."
          : `Ca. ${unclearPct} % af beløbet ligger i poster, der er vage eller uklare.`,
    },
    {
      key: "complete",
      label: "Fuldstændighed",
      points: complete,
      max: 30,
      hint:
        missing === 0
          ? "Alle 10 vigtige punkter er med i tilbuddet."
          : `${present} af 10 vigtige punkter er med – ${missing} mangler.`,
    },
    {
      key: "terms",
      label: "Prisform & vilkår",
      points: terms,
      max: 20,
      hint: termsFlags > 0 ? `${priceHint} Der er ${termsFlags} punkt(er) om vilkår, du bør se på.` : priceHint,
    },
    {
      key: "risk",
      label: "Risiko for ekstraudgifter",
      points: risk,
      max: 20,
      hint:
        riskFlags.length === 0
          ? "Vi fandt ingen tydelige risici for ekstraregninger."
          : `${riskFlags.length} fund kan give ekstraudgifter undervejs.`,
    },
  ];

  const sum = Math.max(0, Math.min(100, spec + complete + terms + risk));
  return { total: sum, label: scoreLabel(sum), breakdown };
}
