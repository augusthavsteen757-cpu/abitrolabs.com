import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { CLIENT_EVENTS, track } from "@/lib/events";

export const runtime = "nodejs";

const schema = z.object({ name: z.enum(CLIENT_EVENTS) });

/** Counts a click in the browser (e.g. "message copied"). Logged-in users only; nothing about the user is stored. */
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`events:${user.id}`, 120, 60 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await track(parsed.data.name);
  return NextResponse.json({ ok: true });
});
