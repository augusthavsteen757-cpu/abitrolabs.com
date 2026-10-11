/** Fills {placeholders}: fmt("Hej {name}", { name: "Mette" }) → "Hej Mette". */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  // A value that already ends with a full stop (e.g. "169.750 kr.") swallows the template's own full stop,
  // so "ender på {w}. Den" never becomes "kr.. Den".
  return template.replace(/\{(\w+)\}(\.?)/g, (m, k: string, dot: string) => {
    if (!(k in vars)) return m;
    const v = String(vars[k]);
    return dot && v.endsWith(".") ? v : v + dot;
  });
}

/** Picks the singular or plural form: plural(n, "1 analyse", "{n} analyser"). */
export function plural(n: number, one: string, other: string): string {
  return fmt(n === 1 ? one : other, { n });
}
