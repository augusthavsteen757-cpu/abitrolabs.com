import { flagsBySeverity, type CheckKey, type QuoteAnalysis } from "./analysis";

/**
 * Forhandlingspunkter: concrete things to ask the contractor for, worked out with fixed rules from the analysis
 * (price type, points missing from the quote, the most serious red flags) – not written by the AI, so they are
 * the same every time and in every language. The texts live in the dictionaries (quote.negotiation).
 */
export type NegotiationKey =
  | "fixedPrice"
  | "clarifyFlag"
  | "paymentAfterWork"
  | "extraWorkInWriting"
  | "timeline"
  | "hourlyRate"
  | "materialsSpecified"
  | "cleanupIncluded"
  | "warranty"
  | "validity"
  | "vatClear"
  | "cvr";

export type NegotiationPoint = { key: NegotiationKey; title?: string };

export const MAX_NEGOTIATION_POINTS = 6;
const MAX_FLAG_POINTS = 2;

/** A missing point in the quote → what to ask for (most money at stake first). */
const CHECK_TO_POINT: [CheckKey, NegotiationKey][] = [
  ["payment", "paymentAfterWork"],
  ["unforeseen", "extraWorkInWriting"],
  ["timeline", "timeline"],
  ["hourly", "hourlyRate"],
  ["materials", "materialsSpecified"],
  ["cleanup", "cleanupIncluded"],
  ["warranty", "warranty"],
  ["validity", "validity"],
  ["vat", "vatClear"],
  ["cvr", "cvr"],
];

export function negotiationPoints(a: Pick<QuoteAnalysis, "priceType" | "flags" | "checks" | "extraCostRisk">): NegotiationPoint[] {
  const out: NegotiationPoint[] = [];
  const add = (p: NegotiationPoint) => {
    if (out.length >= MAX_NEGOTIATION_POINTS) return;
    if (p.key !== "clarifyFlag" && out.some((x) => x.key === p.key)) return;
    out.push(p);
  };
  if (a.priceType === "overslag" || a.priceType === "uklart") add({ key: "fixedPrice" });
  // Costs that can grow: ask for a fixed price or a precise description of exactly those.
  flagsBySeverity(a.flags)
    .filter((f) => f.severity !== "low" && (f.type === "hidden_cost" || f.type === "vague_item" || f.type === "price") && f.title.trim())
    .slice(0, MAX_FLAG_POINTS)
    .forEach((f) => add({ key: "clarifyFlag", title: f.title.trim() }));
  const missing = new Set(a.checks.filter((c) => !c.present).map((c) => c.key));
  for (const [check, key] of CHECK_TO_POINT) if (missing.has(check)) add({ key });
  // A price that can still grow, even if the quote mentions extra work: agree it in writing first.
  if (a.extraCostRisk.max > 0) add({ key: "extraWorkInWriting" });
  return out;
}
