/**
 * Several files of ONE quote are joined into one PDF:  npx tsx scripts/combine.test.mts
 */
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { CombineError, MAX_PAGES, combineFiles, combinedFileName } from "../src/lib/combine";
import { quoteContent } from "../src/lib/quote-content";
import { detectMimeType } from "../src/lib/storage";

let passed = 0;
const test = async (name: string, fn: () => unknown) => {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

async function pdf(pages: string[][]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage();
    lines.forEach((l, i) => page.drawText(l, { x: 50, y: 750 - i * 20, size: 12, font }));
  }
  return Buffer.from(await doc.save());
}
const image = (format: "jpeg" | "png" | "webp", width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#ffffff" } })[format]().toBuffer();

const pagesOf = async (buf: Buffer) => (await PDFDocument.load(buf)).getPages().map((p) => p.getSize());

console.log("Combine tests");

await test("a 2-page PDF, a screenshot (PNG) and a photo (JPEG) become one 4-page PDF, in the chosen order", async () => {
  const out = await combineFiles([
    { data: await pdf([["Side 1"], ["Side 2"]]), mimeType: "application/pdf" },
    { data: await image("png", 390, 844), mimeType: "image/png" },
    { data: await image("jpeg", 1200, 900), mimeType: "image/jpeg" },
  ]);
  assert.equal(detectMimeType(out), "application/pdf");
  const sizes = await pagesOf(out);
  assert.equal(sizes.length, 4);
  // Every image keeps its full resolution as its own page (1 px = 1 pt).
  assert.deepEqual(sizes[2], { width: 390, height: 844 });
  assert.deepEqual(sizes[3], { width: 1200, height: 900 });
});

await test("screenshots only: one page per image", async () => {
  const shots = await Promise.all([1, 2, 3].map(() => image("png", 300, 600)));
  const out = await combineFiles(shots.map((data) => ({ data, mimeType: "image/png" })));
  assert.equal((await pagesOf(out)).length, 3);
});

await test("WebP is refused (the browser converts it to JPEG first)", async () => {
  await assert.rejects(
    combineFiles([{ data: await image("png", 10, 10), mimeType: "image/png" }, { data: await image("webp", 10, 10), mimeType: "image/webp" }]),
    (e) => e instanceof CombineError && e.reason === "unsupported",
  );
});

await test("a broken file is refused clearly, not half-combined", async () => {
  const broken = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from("not really a pdf")]);
  await assert.rejects(
    combineFiles([{ data: await image("png", 10, 10), mimeType: "image/png" }, { data: broken, mimeType: "application/pdf" }]),
    (e) => e instanceof CombineError && e.reason === "unreadable",
  );
  const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]);
  await assert.rejects(
    combineFiles([{ data: await image("png", 10, 10), mimeType: "image/png" }, { data: fakeJpeg, mimeType: "image/jpeg" }]),
    (e) => e instanceof CombineError && e.reason === "unreadable",
  );
});

await test(`more than ${MAX_PAGES} pages in total is refused`, async () => {
  const big = await pdf(Array.from({ length: MAX_PAGES - 1 }, (_, i) => [`Side ${i + 1}`]));
  const shot = await image("png", 10, 10);
  const ok = await combineFiles([{ data: big, mimeType: "application/pdf" }, { data: shot, mimeType: "image/png" }]);
  assert.equal((await pagesOf(ok)).length, MAX_PAGES);
  await assert.rejects(
    combineFiles([{ data: big, mimeType: "application/pdf" }, { data: shot, mimeType: "image/png" }, { data: shot, mimeType: "image/png" }]),
    (e) => e instanceof CombineError && e.reason === "tooManyPages",
  );
});

await test("a CPR number in a combined PDF still never reaches the AI", async () => {
  const out = await combineFiles([
    { data: await pdf([["Tilbud fra Eksempel ApS", "Kunde: Anna Hansen, CPR 120385-1234", "I alt 50.000 kr."]]), mimeType: "application/pdf" },
    { data: await image("png", 200, 300), mimeType: "image/png" },
  ]);
  const { block, cprHidden } = await quoteContent(out, "application/pdf");
  assert.equal(cprHidden, 1);
  assert.equal(block.type, "text");
  assert.ok(block.type === "text" && !block.text.includes("120385") && block.text.includes("50.000 kr."));
});

await test("the combined file is named after the first file", () => {
  assert.equal(combinedFileName(["IMG_1234.jpg", "IMG_1235.jpg", "IMG_1236.jpg"]), "IMG_1234 +2.pdf");
  assert.equal(combinedFileName(["tilbud.pdf", "side3.png"]), "tilbud +1.pdf");
  assert.equal(combinedFileName(["", "x.png"]), "tilbud +1.pdf");
});

console.log(`\n${passed} tests passed`);
