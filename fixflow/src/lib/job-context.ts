/**
 * Optional facts the customer gives about the job at upload (house type, year built, load-bearing work).
 * They let the analysis check what matters for that kind of job – e.g. the owners' association for a flat,
 * structural calculations for load-bearing walls, asbestos in older houses. Only fixed choices and a year
 * are accepted, so no free text from the form can reach the AI prompt.
 */
export const HOUSING = ["house", "rowhouse", "apartment", "summerhouse", "farm"] as const;
export const LOAD_BEARING = ["yes", "no", "unknown"] as const;

export type JobContext = {
  housing?: (typeof HOUSING)[number];
  builtYear?: number;
  loadBearing?: (typeof LOAD_BEARING)[number];
};

const pick = <T extends readonly string[]>(list: T, v: unknown): T[number] | undefined =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;

/** Reads the optional fields; anything unknown or out of range is dropped. Null when nothing was given. */
export function parseJobContext(get: (key: string) => unknown): JobContext | null {
  const ctx: JobContext = {};
  const housing = pick(HOUSING, get("housing"));
  if (housing) ctx.housing = housing;
  const year = Number.parseInt(String(get("builtYear") ?? ""), 10);
  if (Number.isFinite(year) && year >= 1500 && year <= new Date().getFullYear() + 2) ctx.builtYear = year;
  const loadBearing = pick(LOAD_BEARING, get("loadBearing"));
  if (loadBearing) ctx.loadBearing = loadBearing;
  return Object.keys(ctx).length ? ctx : null;
}

/** Stored JSON → context (tolerates old rows and bad data). */
export function readJobContext(json: string | null | undefined): JobContext | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json) as Record<string, unknown>;
    return parseJobContext((k) => (k === "builtYear" && typeof v[k] === "number" ? String(v[k]) : v[k]));
  } catch {
    return null;
  }
}

const HOUSING_DA: Record<(typeof HOUSING)[number], string> = {
  house: "parcelhus/villa",
  rowhouse: "rækkehus",
  apartment: "ejerlejlighed i etageejendom (ejerforening)",
  summerhouse: "sommerhus/fritidshus",
  farm: "landejendom",
};
const LOAD_BEARING_DA: Record<(typeof LOAD_BEARING)[number], string> = {
  yes: "ja",
  no: "nej",
  unknown: "ved ikke",
};

/** The context as Danish lines for the AI (always Danish, like the rest of the prompt). */
export function jobContextForAi(ctx: JobContext | null): string | null {
  if (!ctx) return null;
  const lines = [
    ctx.housing && `- Boligtype: ${HOUSING_DA[ctx.housing]}`,
    ctx.builtYear && `- Byggeår: ca. ${ctx.builtYear}`,
    ctx.loadBearing && `- Berører arbejdet bærende vægge eller konstruktioner: ${LOAD_BEARING_DA[ctx.loadBearing]}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}
