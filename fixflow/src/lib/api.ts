import { da } from "@/i18n/dict/da";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

/** JSON error in the viewer's language. Messages are raised with the Danish source text (da.errors.*). */
export async function jsonError(message: string, status = 400, vars?: Record<string, string | number>) {
  let text = message;
  try {
    text = translateError(message, await getDict(), vars);
  } catch {
    // Outside a request scope – fall back to the source text.
  }
  return NextResponse.json({ error: text }, { status });
}

/** Logs an unexpected error without query parameters (they can contain e-mails, names or password hashes). */
export function logError(err: unknown) {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string }; query?: string; stack?: string };
  const message = (e?.message ?? String(err)).split("\nparams:")[0].slice(0, 500);
  console.error(JSON.stringify({ event: "error", name: e?.name, message, code: e?.cause?.code, query: e?.query?.slice(0, 300), stack: e?.stack?.split("\n").slice(1, 4).join(" | ") }));
}

/** Wraps a route handler so thrown errors become friendly JSON errors. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.message, err.status, err.vars);
      if (err instanceof ZodError) return jsonError(da.errors.invalidInput, 400);
      logError(err);
      return jsonError(da.errors.unexpected, 500);
    }
  };
}
