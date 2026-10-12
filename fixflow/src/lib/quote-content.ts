import type Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { containsCpr, maskCpr } from "./cpr";
import { extractPdfText } from "./pdf-text";

const MAX_TEXT_CHARS = 120_000;
/** A page with less readable text than this is a screenshot, photo or scan. */
const MIN_PAGE_TEXT = 20;

/**
 * What the AI gets to see of the uploaded file. CPR numbers must never reach the AI: if a PDF's text
 * layer contains one, only the text – with every CPR number replaced – is sent instead of the PDF.
 * Pages without a text layer (screenshots or photos joined into the PDF, scanned pages) can't be sent as
 * text, so those pages alone are sent as a small PDF next to it – otherwise they would be lost. Like any
 * photo, they are the user's to cover CPR numbers on. PDFs without a CPR number are sent as they are (the
 * AI also sees layout and tables).
 */
export async function quoteContent(data: Buffer, mimeType: string): Promise<{ blocks: Anthropic.ContentBlockParam[]; cprHidden: number }> {
  if (mimeType === "application/pdf") {
    const extracted = await extractPdfText(data);
    if (extracted && containsCpr(extracted.text)) {
      const { text, count } = maskCpr(extracted.text.slice(0, MAX_TEXT_CHARS));
      const imagePages = extracted.pageTexts.flatMap((t, i) => (t.replace(/\s/g, "").length < MIN_PAGE_TEXT ? [i] : []));
      const imagePdf = imagePages.length ? await pagesAsPdf(data, imagePages) : null;
      const blocks: Anthropic.ContentBlockParam[] = [
        {
          type: "text",
          text:
            `Tilbuddets tekst, udtrukket fra PDF'en (${extracted.pages} side${extracted.pages === 1 ? "" : "r"}). CPR-numre er fjernet af privatlivshensyn. Layout, logoer og billeder er ikke med; tabeller står som linjer.` +
            (imagePdf ? ` Siderne uden tekst (fx skærmbilleder eller fotos af tilbuddet) følger efter teksten som en PDF – de hører til samme tilbud.` : "") +
            `\n\n<tilbud>\n${text}\n</tilbud>`,
        },
      ];
      if (imagePdf) blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: imagePdf.toString("base64") } });
      return { blocks, cprHidden: count };
    }
    return { blocks: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") } }], cprHidden: 0 };
  }
  return {
    blocks: [
      {
        type: "image",
        source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp", data: data.toString("base64") },
      },
    ],
    cprHidden: 0,
  };
}

/** A new PDF with only the given pages (0-based). Null if the PDF can't be split – then only the text is sent. */
async function pagesAsPdf(data: Buffer, indices: number[]): Promise<Buffer | null> {
  try {
    const src = await PDFDocument.load(data, { updateMetadata: false });
    const out = await PDFDocument.create();
    for (const p of await out.copyPages(src, indices)) out.addPage(p);
    return Buffer.from(await out.save());
  } catch {
    return null;
  }
}
