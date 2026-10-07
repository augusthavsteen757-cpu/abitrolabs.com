import { getLocale } from "@/i18n/server";
import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { ALLOWED_TYPES, MAX_FILE_SIZE, detectMimeType, saveFile } from "@/lib/storage";
import { listQuotes, publicQuote, runAnalysis } from "@/lib/quotes";
import { getUsage } from "@/lib/plans";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export const GET = handle(async () => {
  const user = await requireApiUser();
  const list = await listQuotes(user.id);
  return NextResponse.json({ quotes: list.map((q) => publicQuote(user, q)) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`upload:${user.id}`, 20, 60 * 60);
  await rateLimit(`upload-ip:${await clientIp()}`, 40, 60 * 60);
  if (getUsage(user).remaining <= 0) {
    return jsonError(da.errors.noAnalysesLeft, 402);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(da.errors.chooseFile);
  if (file.size === 0) return jsonError(da.errors.fileEmpty);
  if (file.size > MAX_FILE_SIZE) return jsonError(da.errors.fileTooBig, 413);

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = detectMimeType(buf);
  if (!mimeType || !ALLOWED_TYPES[mimeType]) {
    return jsonError(da.errors.fileType, 415);
  }

  const projectRaw = String(form?.get("projectName") ?? "").trim().slice(0, 80);
  const projectName = projectRaw || "Mit projekt";
  const fileName = (file.name || `tilbud.${ALLOWED_TYPES[mimeType]}`).slice(0, 200);

  const fileKey = await saveFile(user.id, buf, mimeType);
  const [quote] = await db
    .insert(quotes)
    .values({ userId: user.id, projectName, fileName, fileKey, mimeType, fileSize: buf.length })
    .returning();

  const result = await runAnalysis(user, quote, await getLocale());
  return NextResponse.json({ quote: publicQuote(user, result) }, { status: 201 });
});
