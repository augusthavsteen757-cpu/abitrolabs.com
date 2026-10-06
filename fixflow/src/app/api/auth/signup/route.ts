import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, passwordProblem, setSessionCookie } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().max(200),
  acceptTerms: z.literal(true),
});

export const POST = handle(async (req: Request) => {
  await rateLimit(`signup:${await clientIp()}`, 5, 60 * 60);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "acceptTerms") return jsonError("Du skal acceptere handelsbetingelserne og privatlivspolitikken.");
    if (field === "email") return jsonError("Skriv en gyldig e-mailadresse.");
    if (field === "password") return jsonError("Skriv en adgangskode.");
    return jsonError("Skriv dit navn.");
  }
  const { name, email, password } = parsed.data;
  const problem = passwordProblem(password, email);
  if (problem) return jsonError(problem);

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return jsonError("Der findes allerede en konto med den e-mail. Prøv at logge ind.", 409);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password), acceptedTermsAt: new Date() })
    .returning();
  await setSessionCookie(user);
  return NextResponse.json({ ok: true });
});
