import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

export const POST = handle(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "password") return jsonError("Adgangskoden skal være mindst 8 tegn.");
    if (field === "email") return jsonError("Skriv en gyldig e-mailadresse.");
    return jsonError("Skriv dit navn.");
  }
  const { name, email, password } = parsed.data;
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return jsonError("Der findes allerede en konto med den e-mail. Prøv at logge ind.", 409);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning({ id: users.id });
  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
});
