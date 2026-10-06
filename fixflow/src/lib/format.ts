const dkk = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** "160.500 kr." */
export function formatKr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return `${dkk.format(Math.round(n))} kr.`;
}

/** Money in the quote's own currency: "160.500 kr." for DKK, "12.400 EUR" otherwise. */
export function formatMoney(n: number | null | undefined, currency = "DKK"): string {
  if (currency === "DKK") return formatKr(n);
  if (n == null || !Number.isFinite(n)) return "–";
  return `${dkk.format(Math.round(n))} ${currency}`;
}

export function formatRange(min: number, max: number, currency = "DKK"): string {
  if (max <= 0) return formatMoney(0, currency);
  if (Math.round(min) === Math.round(max)) return formatMoney(max, currency);
  return `${dkk.format(Math.round(min))}–${formatMoney(max, currency)}`;
}

export function formatPct(n: number): string {
  return `${Math.round(n * 100)} %`;
}

const dateFmt = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short" });

export function formatDate(d: Date | string | number | null | undefined): string {
  if (d == null || d === "") return "–";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return dateFmt.format(date);
}

export function formatShortDate(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  return shortFmt.format(date);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
