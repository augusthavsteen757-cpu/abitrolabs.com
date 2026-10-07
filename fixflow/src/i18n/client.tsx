"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dict/da";

const I18nContext = createContext<{ locale: Locale; d: Dict } | null>(null);

export function I18nProvider({ locale, d, children }: { locale: Locale; d: Dict; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, d }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
