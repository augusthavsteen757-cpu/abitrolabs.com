/** Fills {placeholders}: fmt("Hej {name}", { name: "Mette" }) → "Hej Mette". */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Picks the singular or plural form: plural(n, "1 analyse", "{n} analyser"). */
export function plural(n: number, one: string, other: string): string {
  return fmt(n === 1 ? one : other, { n });
}
