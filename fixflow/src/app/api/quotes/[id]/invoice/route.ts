import { getLocale } from "@/i18n/server";
import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getQuote } from "@/lib/quotes";
import { hasFullAccess } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { ALLOWED_TYPES, MAX_FILE_SIZE, detectMimeType } from "@/lib/storage";
import { CombineError, MAX_FILES, MAX_PAGES, MAX_TOTAL_SIZE, combineFiles, combinedFileName } from "@/lib/combine";
import { listInvoiceChecks, publicInvoiceCheck, runInvoiceCheck } from "@/lib/invoices";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  const checks = await listInvoiceChecks(user.id, quote.id);
  return NextResponse.json({ checks: checks.map(publicInvoiceCheck) });
});

/** Upload an invoice (one file, or several photos/pages of it) and compare it with the quote. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireApiUser();
  await rateLimit(`upload:${user.id}`, 20, 60 * 60);
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  // The comparison shows the quote's details, so a locked (free preview) quote must be opened first.
  if (!hasFullAccess(user, quote)) return jsonError(da.errors.invoiceNeedUnlock, 402);
  if (quote.status !== "DONE") return jsonError(da.errors.notAnalyzed);

  const form = await req.formData().catch(() => null);
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
    if (files.length === 1 && mimeType !== "application/pdf" && data.length > 5 * 1024 * 1024) return jsonError(da.errors.imageTooLarge, 413);
    if (mimeType === "application/pdf") {
      const head = data.toString("latin1");
      if (/\/Encrypt\b/.test(head)) return jsonError(da.errors.pdfEncrypted, 415);
      if ((head.match(/\/Type\s*\/Page(?!s)/g) ?? []).length > MAX_PAGES) return jsonError(da.errors.pdfTooManyPages, 413);
    }
    inputs.push({ data, mimeType, name: file.name || `regning.${ALLOWED_TYPES[mimeType]}` });
  }

  let input = { ...inputs[0], name: inputs[0].name.slice(0, 200) };
  if (inputs.length > 1) {
    try {
      input = { data: await combineFiles(inputs), mimeType: "application/pdf", name: combinedFileName(inputs.map((i) => i.name)) };
    } catch (err) {
      if (err instanceof CombineError) {
        if (err.reason === "tooManyPages") return jsonError(da.errors.pdfTooManyPages, 413);
        if (err.reason === "unsupported") return jsonError(da.errors.fileType, 415);
        return jsonError(da.errors.combineFailed, 422);
      }
      throw err;
    }
  }

  const check = await runInvoiceCheck(user, quote, input, await getLocale());
  return NextResponse.json({ check: publicInvoiceCheck(check) }, { status: 201 });
});
