import type { Locale } from "../config";
import { da, type Dict } from "./da";
import { de } from "./de";
import { en } from "./en";
import { nb } from "./nb";
import { pl } from "./pl";
import { ro } from "./ro";
import { sv } from "./sv";
import { uk } from "./uk";

// Every dictionary must match the Danish one exactly (enforced by the Dict type).
export const DICTS: Record<Locale, Dict> = { da, en, sv, nb, de, pl, uk, ro };

export type { Dict };
