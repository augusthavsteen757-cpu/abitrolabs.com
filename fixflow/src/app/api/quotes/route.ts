import { NextResponse } from "next/server";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { ALLOWED_TYPES, MAX_FILE_SIZE, detectMimeType, saveFile } from "@/lib/storage";
import { listQuotes, publicQuote, runAnalysis } from "@/lib/quotes";
import { getUsage } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 120;

export const GET = handle(async () => {
  const user = await requireApiUser();
  const list = await listQuotes(user.id);
  return NextResponse.json({ quotes: list.map((q) => publicQuote(user, q)) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  if (getUsage(user).remaining <= 0) {
    return jsonError("Du har ikke flere analyser tilbage. Opgradér til Pro eller køb en enkelt analyse.", 402);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Vælg en fil at uploade.");
  if (file.size === 0) return jsonError("Filen er tom.");
  if (file.size > MAX_FILE_SIZE) return jsonError("Filen er for stor. Maks. 10 MB.", 413);

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = detectMimeType(buf);
  if (!mimeType || !ALLOWED_TYPES[mimeType]) {
    return jsonError("Filtypen understøttes ikke. Brug PDF, JPG, PNG eller WEBP.", 415);
  }

  const projectRaw = String(form?.get("projectName") ?? "").trim().slice(0, 80);
  const projectName = projectRaw || "Mit projekt";
  const fileName = (file.name || `tilbud.${ALLOWED_TYPES[mimeType]}`).slice(0, 200);

  const fileKey = await saveFile(user.id, buf, mimeType);
  const [quote] = await db
    .insert(quotes)
    .values({ userId: user.id, projectName, fileName, fileKey, mimeType, fileSize: buf.length })
    .returning();

  const result = await runAnalysis(user, quote);
  return NextResponse.json({ quote: publicQuote(user, result) }, { status: 201 });
});
