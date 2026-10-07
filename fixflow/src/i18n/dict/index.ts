import type { Locale } from "../config";
import { da, type Dict } from "./da";

// Filled in as translations are added; every dictionary must match the Danish one exactly.
export const DICTS: Record<Locale, Dict> = {
  da,
  en: da,
  sv: da,
  nb: da,
  de: da,
  pl: da,
  uk: da,
  ro: da,
};

export type { Dict };
