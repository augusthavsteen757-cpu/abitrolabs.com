import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { locatePostalCode } from "@/lib/geo";

const schema = z.object({ postalCode: z.string().trim().regex(/^\d{4}$/) });

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.postalInvalid);
  const place = await locatePostalCode(parsed.data.postalCode);
  if (!place) return jsonError(da.errors.postalUnknown);
  await db.update(users).set({ postalCode: parsed.data.postalCode }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true, place });
});
