import type Anthropic from "@anthropic-ai/sdk";
import { containsCpr, maskCpr } from "./cpr";
import { extractPdfText } from "./pdf-text";

const MAX_TEXT_CHARS = 120_000;

/**
 * What the AI gets to see of the uploaded file. CPR numbers must never reach the AI: if a PDF's text
 * layer contains one, only the text – with every CPR number replaced – is sent instead of the PDF.
 * PDFs without a CPR number are sent as they are (the AI also sees layout and tables). Photos and
 * scanned PDFs have no text we can read here, so the user is asked to cover CPR numbers themselves.
 */
export async function quoteContent(data: Buffer, mimeType: string): Promise<{ block: Anthropic.ContentBlockParam; cprHidden: number }> {
  if (mimeType === "application/pdf") {
    const extracted = await extractPdfText(data);
    if (extracted && containsCpr(extracted.text)) {
      const { text, count } = maskCpr(extracted.text.slice(0, MAX_TEXT_CHARS));
      return {
        block: {
          type: "text",
          text: `Tilbuddets tekst, udtrukket fra PDF'en (${extracted.pages} side${extracted.pages === 1 ? "" : "r"}). CPR-numre er fjernet af privatlivshensyn. Layout, logoer og billeder er ikke med; tabeller står som linjer.\n\n<tilbud>\n${text}\n</tilbud>`,
        },
        cprHidden: count,
      };
    }
    return { block: { type: "document", source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") } }, cprHidden: 0 };
  }
  return {
    block: {
      type: "image",
      source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp", data: data.toString("base64") },
    },
    cprHidden: 0,
  };
}
