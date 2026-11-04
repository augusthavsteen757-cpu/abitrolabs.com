/** Normalises a Danish phone number from the "Ring mig op" form: 8 digits, optionally with +45/0045. Returns null when invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^(\+45|0045)/, "");
  if (!/^\d{8}$/.test(digits)) return null;
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

/** "Ring mig op" requests are deleted automatically after this many days (stated in the privacy policy). */
export const CALLBACK_KEEP_DAYS = 180;
