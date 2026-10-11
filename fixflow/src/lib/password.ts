import { da } from "@/i18n/dict/da";

const COMMON_PASSWORDS = new Set([
  "1234567890", "12345678910", "qwertyuiop", "password123", "adgangskode", "adgangskode1", "kodeord123",
  "sommer2024", "sommer2025", "sommer2026", "vinter2025", "vinter2026", "danmark123", "fixflow123", "abcdefghij",
]);

/** Returns a Danish error message, or null if the password is acceptable. */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 10) return da.errors.pwShort;
  if (pw.length > 200) return da.errors.pwLong;
  if (COMMON_PASSWORDS.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw)) return da.errors.pwWeak;
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4)
    return da.errors.pwEmail;
  return null;
}
