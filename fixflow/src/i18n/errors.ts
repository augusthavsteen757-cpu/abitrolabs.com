import { da, type Dict } from "./dict/da";
import { fmt } from "./fmt";

type ErrorKey = keyof Dict["errors"];
const BY_DANISH = new Map<string, ErrorKey>(
  (Object.entries(da.errors) as [ErrorKey, string][]).map(([k, v]) => [v, k]),
);

/**
 * Server code raises errors with the Danish source text (da.errors.*). This turns such a message
 * into the viewer's language. Unknown messages are returned unchanged.
 */
export function translateError(message: string, d: Dict, vars?: Record<string, string | number>): string {
  const key = BY_DANISH.get(message);
  if (key) return vars ? fmt(d.errors[key], vars) : d.errors[key];
  return message;
}
