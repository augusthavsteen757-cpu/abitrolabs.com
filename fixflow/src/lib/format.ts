const dkk = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** "160.500 kr." */
export function formatKr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return `${dkk.format(Math.round(n))} kr.`;
}

export function formatRange(min: number, max: number): string {
  if (max <= 0) return "0 kr.";
  if (Math.round(min) === Math.round(max)) return formatKr(max);
  return `${dkk.format(Math.round(min))}–${formatKr(max)}`;
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
