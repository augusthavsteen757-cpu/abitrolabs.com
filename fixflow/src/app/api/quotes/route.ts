import { getLocale } from "@/i18n/server";
import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { ALLOWED_TYPES, MAX_FILE_SIZE, deleteStoredFile, detectMimeType, saveFile } from "@/lib/storage";
import { HttpError } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { listQuotes, publicQuote, runAnalysis } from "@/lib/quotes";
import { getUsage } from "@/lib/plans";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { CombineError, MAX_FILES, MAX_PAGES, MAX_TOTAL_SIZE, combineFiles, combinedFileName } from "@/lib/combine";

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
  // Several files = several pages/screenshots of ONE quote. They are joined into one PDF and analysed once.
  const files = (form?.getAll("file") ?? []).filter((f): f is File => f instanceof File);
  if (!files.length) return jsonError(da.errors.chooseFile);
  if (files.length > MAX_FILES) return jsonError(da.errors.tooManyFiles, 413);

  const inputs: { data: Buffer; mimeType: string; name: string }[] = [];
  let total = 0;
  for (const file of files) {
    if (file.size === 0) return jsonError(da.errors.fileEmpty);
    if (file.size > MAX_FILE_SIZE) return jsonError(da.errors.fileTooBig, 413);
    total += file.size;
    if (total > MAX_TOTAL_SIZE) return jsonError(da.errors.filesTooBig, 413);
    const data = Buffer.from(await file.arrayBuffer());
    const mimeType = detectMimeType(data);
    if (!mimeType || !ALLOWED_TYPES[mimeType]) return jsonError(da.errors.fileType, 415);
    // Claude's limits: images up to 5 MB, PDFs up to 100 pages and not encrypted. Say so clearly up front.
    if (files.length === 1 && mimeType !== "application/pdf" && data.length > 5 * 1024 * 1024) return jsonError(da.errors.imageTooLarge, 413);
    if (mimeType === "application/pdf") {
      const head = data.toString("latin1");
      if (/\/Encrypt\b/.test(head)) return jsonError(da.errors.pdfEncrypted, 415);
      const pages = (head.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
      if (pages > MAX_PAGES) return jsonError(da.errors.pdfTooManyPages, 413);
    }
    inputs.push({ data, mimeType, name: file.name || `tilbud.${ALLOWED_TYPES[mimeType]}` });
  }

  const projectRaw = String(form?.get("projectName") ?? "").trim().slice(0, 80);
  const projectName = projectRaw || "Mit projekt";
  let buf = inputs[0].data;
  let mimeType = inputs[0].mimeType;
  let fileName = inputs[0].name.slice(0, 200);
  if (inputs.length > 1) {
    try {
      buf = await combineFiles(inputs);
    } catch (err) {
      if (err instanceof CombineError) {
        if (err.reason === "tooManyPages") return jsonError(da.errors.pdfTooManyPages, 413);
        if (err.reason === "unsupported") return jsonError(da.errors.fileType, 415);
        return jsonError(da.errors.combineFailed, 422);
      }
      throw err;
    }
    mimeType = "application/pdf";
    fileName = combinedFileName(inputs.map((i) => i.name));
  }

  const fileKey = await saveFile(user.id, buf, mimeType);
  const [quote] = await db
    .insert(quotes)
    .values({ userId: user.id, projectName, fileName, fileKey, mimeType, fileSize: buf.length })
    .returning();

  try {
    const result = await runAnalysis(user, quote, await getLocale());
    return NextResponse.json({ quote: publicQuote(user, result) }, { status: 201 });
  } catch (err) {
    // No analyses left (e.g. two uploads at once): don't leave an empty quote and its file behind.
    if (err instanceof HttpError && err.status === 402) {
      await db.delete(quotes).where(eq(quotes.id, quote.id));
      await deleteStoredFile(fileKey).catch(() => undefined);
    }
    throw err;
  }
});
