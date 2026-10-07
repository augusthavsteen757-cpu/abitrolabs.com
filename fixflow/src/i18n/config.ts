export const LOCALES = ["da", "en", "sv", "nb", "de", "pl", "uk", "ro"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "da";
export const LOCALE_COOKIE = "ff_lang";

/** Shown in the language picker – each language in its own name. */
export const LOCALE_NAMES: Record<Locale, string> = {
  da: "Dansk",
  en: "English",
  sv: "Svenska",
  nb: "Norsk",
  de: "Deutsch",
  pl: "Polski",
  uk: "Українська",
  ro: "Română",
};

/** For <html lang> and Intl date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  da: "da-DK",
  en: "en-GB",
  sv: "sv-SE",
  nb: "nb-NO",
  de: "de-DE",
  pl: "pl-PL",
  uk: "uk-UA",
  ro: "ro-RO",
};

/** Language name (in Danish) used when telling the AI which language to write in. */
export const AI_LANGUAGE: Record<Locale, string> = {
  da: "dansk",
  en: "engelsk (English)",
  sv: "svensk (svenska)",
  nb: "norsk bokmål",
  de: "tysk (Deutsch)",
  pl: "polsk (polski)",
  uk: "ukrainsk (українська)",
  ro: "rumænsk (română)",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Best match from an Accept-Language header, e.g. "sv-SE,sv;q=0.9,en;q=0.8". */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const prefs = header
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of prefs) {
    const base = tag.split("-")[0];
    if (base === "no" || base === "nn" || base === "nb") return "nb";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
