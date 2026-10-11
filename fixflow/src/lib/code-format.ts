/** Pure partner-code rules (no database), shared by lib/codes.ts and the unit tests. */

/** Codes are typed by people: case, spaces and dashes don't matter. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type CodeSpec = { code: string; maxUses: number; credits: number };

/**
 * PARTNER_CODES="MAEGLERSVB=50, ENERGIODENSE=50:2" – code=uses or code=uses:analyses per redemption.
 * Invalid entries are skipped (and logged), so one typo never takes the app down.
 */
export function parsePartnerCodes(raw: string | undefined): CodeSpec[] {
  const out = new Map<string, CodeSpec>();
  for (const entry of (raw ?? "").split(",")) {
    const m = entry.trim().match(/^([^=]+)=(\d+)(?::(\d+))?$/);
    const code = m ? normalizeCode(m[1]) : "";
    const maxUses = m ? Number(m[2]) : 0;
    const credits = m?.[3] ? Number(m[3]) : 1;
    if (!m || code.length < 4 || code.length > 32 || maxUses < 1 || maxUses > 100_000 || credits < 1 || credits > 10) {
      if (entry.trim()) console.warn(JSON.stringify({ event: "partner_code_invalid", entry: entry.trim().slice(0, 60) }));
      continue;
    }
    out.set(code, { code, maxUses, credits });
  }
  return [...out.values()];
}
