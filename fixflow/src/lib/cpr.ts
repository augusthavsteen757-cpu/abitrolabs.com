/**
 * Danish CPR numbers (DDMMÅÅ-XXXX) are never needed to explain a quote, so they are removed before
 * the text is sent to the AI. Matches with a hyphen, a space or nothing between the date and the
 * last four digits, optional single spaces inside the date ("12 03 85 1234"), and only when the
 * first six digits form a real day and month – so phone numbers (8 digits), CVR numbers (8 digits)
 * and amounts like "125.000" are left alone. A 10-digit bank account number that happens to start
 * with a valid date is also hidden; that is harmless for the analysis.
 */
const CPR = /(?<![\d-])(0[1-9]|[12]\d|3[01]) ?(0[1-9]|1[0-2]) ?(\d{2})[  ]?[-‐-–]?[  ]?(\d{4})(?![\d-])/g;

export const CPR_PLACEHOLDER = "[CPR-nummer skjult]";

export function maskCpr(text: string): { text: string; count: number } {
  let count = 0;
  const out = text.replace(CPR, () => {
    count++;
    return CPR_PLACEHOLDER;
  });
  return { text: out, count };
}

/** True if the text still contains something that looks like a CPR number. */
export function containsCpr(text: string): boolean {
  CPR.lastIndex = 0;
  const found = CPR.test(text);
  CPR.lastIndex = 0;
  return found;
}

/** Removes CPR numbers from every string in a value (used on the AI's answer as a second safety net). */
export function maskCprDeep<T>(value: T): T {
  if (typeof value === "string") return maskCpr(value).text as T;
  if (Array.isArray(value)) return value.map((v) => maskCprDeep(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskCprDeep(v)])) as T;
  }
  return value;
}
