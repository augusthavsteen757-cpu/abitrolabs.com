// The worker is imported statically so the standalone build includes it, and pdf.js runs it in-process.
import * as pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfWorker;

// Same limit as uploads, so a CPR number on any page is found.
const MAX_PAGES = 100;

/**
 * Reads the text layer of a PDF, line by line (items on the same height are joined), so it can be
 * checked for CPR numbers before anything is sent to the AI. Scanned PDFs have no text layer and
 * return (almost) nothing. Returns null if the PDF cannot be read at all.
 */
export async function extractPdfText(data: Buffer): Promise<{ text: string; pages: number; pageTexts: string[] } | null> {
  let task: ReturnType<typeof getDocument> | null = null;
  try {
    task = getDocument({
      data: new Uint8Array(data),
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await task.promise;
    const pages: string[] = [];
    for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const lines = new Map<number, { x: number; s: string }[]>();
      for (const item of content.items) {
        if (!("str" in item) || !item.str) continue;
        const y = Math.round(item.transform[5]);
        const key = [...lines.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
        const line = lines.get(key) ?? [];
        line.push({ x: item.transform[4], s: item.str });
        lines.set(key, line);
      }
      const text = [...lines.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => items.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
      pages.push(text);
      page.cleanup();
    }
    return { text: pages.join("\n\n--- Ny side ---\n\n"), pages: doc.numPages, pageTexts: pages };
  } catch (e) {
    if (process.env.DEBUG_PDF) console.error(e);
    return null;
  } finally {
    await task?.destroy().catch(() => {});
  }
}
