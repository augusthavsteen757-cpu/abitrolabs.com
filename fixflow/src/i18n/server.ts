import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import { DICTS, type Dict } from "./dict";

/** The viewer's language: their choice (cookie), else the browser's language, else Danish. */
export async function getLocale(): Promise<Locale> {
  try {
    const c = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(c)) return c;
    return localeFromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function getDict(): Promise<Dict> {
  return DICTS[await getLocale()];
}

export async function getI18n(): Promise<{ locale: Locale; d: Dict }> {
  const locale = await getLocale();
  return { locale, d: DICTS[locale] };
}
