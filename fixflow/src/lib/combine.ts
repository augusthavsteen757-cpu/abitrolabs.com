import { PDFDocument } from "pdf-lib";

/** One quote can be made of several files – e.g. a few screenshots, or a PDF plus a photo of the last page. */
export const MAX_FILES = 10;
/** Together they must stay well under the AI's 32 MB request limit (base64 adds a third). */
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
export const MAX_PAGES = 100;

export type InputFile = { data: Buffer; mimeType: string };

export class CombineError extends Error {
  constructor(readonly reason: "tooManyPages" | "unreadable" | "unsupported") {
    super(reason);
  }
}

/**
 * Joins the files of ONE quote into a single PDF, in the order they were chosen: PDF pages are copied as
 * they are, every image becomes a page of its own size. The quote is then stored, shown and analysed exactly
 * like a single uploaded PDF – so it costs one analysis, and "see original" shows every page.
 */
export async function combineFiles(files: InputFile[]): Promise<Buffer> {
  const out = await PDFDocument.create();
  for (const f of files) {
    if (f.mimeType === "application/pdf") {
      // pdf-lib parses lazily: a damaged file may only fail when its pages are read or copied.
      let src: PDFDocument;
      let count: number;
      try {
        src = await PDFDocument.load(f.data, { updateMetadata: false });
        count = src.getPageCount();
      } catch {
        throw new CombineError("unreadable");
      }
      if (count === 0) throw new CombineError("unreadable");
      if (out.getPageCount() + count > MAX_PAGES) throw new CombineError("tooManyPages");
      let pages;
      try {
        pages = await out.copyPages(src, src.getPageIndices());
      } catch {
        throw new CombineError("unreadable");
      }
      for (const p of pages) out.addPage(p);
    } else if (f.mimeType === "image/jpeg" || f.mimeType === "image/png") {
      if (out.getPageCount() + 1 > MAX_PAGES) throw new CombineError("tooManyPages");
      let img;
      try {
        img = f.mimeType === "image/jpeg" ? await out.embedJpg(f.data) : await out.embedPng(f.data);
      } catch {
        throw new CombineError("unreadable");
      }
      // 1 px = 1 pt keeps the full resolution when the page is rendered for the AI.
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    } else {
      // WebP can't go into a PDF here; the browser converts it to JPEG before upload.
      throw new CombineError("unsupported");
    }
  }
  return Buffer.from(await out.save());
}

/** "IMG_1234.jpg" + 2 more → "IMG_1234 +2.pdf" (the first name helps the user recognise the quote). */
export function combinedFileName(names: string[]): string {
  const stem = (names[0] || "tilbud").replace(/\.[A-Za-z0-9]{1,5}$/, "").slice(0, 150);
  return `${stem} +${names.length - 1}.pdf`;
}
