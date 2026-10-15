import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceChecks } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";

export const runtime = "nodejs";

/** Deletes one invoice check (the user's own only). */
export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string; checkId: string }> }) => {
  const { id, checkId } = await params;
  const user = await requireApiUser();
  const deleted = await db
    .delete(invoiceChecks)
    .where(and(eq(invoiceChecks.id, checkId), eq(invoiceChecks.quoteId, id), eq(invoiceChecks.userId, user.id)))
    .returning({ id: invoiceChecks.id });
  if (!deleted.length) return jsonError(da.errors.invoiceNotFound, 404);
  return NextResponse.json({ ok: true });
});
