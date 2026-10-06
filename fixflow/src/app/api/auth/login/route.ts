import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkPassword, setSessionCookie } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase(), password: z.string() });

export const POST = handle(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Skriv e-mail og adgangskode.");
  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !(await checkPassword(parsed.data.password, user.passwordHash))) {
    return jsonError("Forkert e-mail eller adgangskode.", 401);
  }
  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
});
