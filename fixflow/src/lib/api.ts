import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler so thrown errors become friendly Danish JSON errors. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.message, err.status);
      if (err instanceof ZodError) return jsonError("Ugyldige oplysninger. Tjek felterne og prøv igen.", 400);
      console.error(err);
      return jsonError("Der skete en uventet fejl. Prøv igen om lidt.", 500);
    }
  };
}
