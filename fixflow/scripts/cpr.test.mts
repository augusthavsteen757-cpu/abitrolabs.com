/**
 * CPR numbers must never reach the AI:  npx tsx scripts/cpr.test.mts
 */
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { CPR_PLACEHOLDER, containsCpr, maskCpr, maskCprDeep } from "../src/lib/cpr";
import { quoteContent } from "../src/lib/quote-content";

let passed = 0;
const test = async (name: string, fn: () => unknown) => {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

async function pdf(lines: string[]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  lines.forEach((l, i) => page.drawText(l, { x: 50, y: 750 - i * 20, size: 12, font }));
  return Buffer.from(await doc.save());
}

console.log("CPR tests");

await test("finds CPR numbers written in every common way", () => {
  for (const s of ["120385-1234", "1203851234", "120385 1234", "12 03 85 1234", "120385–1234", "120385 - 1234", "CPR-nr.: 010100-4321", "cpr 311299-0001", "Født 290204-1111."]) {
    const r = maskCpr(`Kunde ${s} tak`);
    assert.equal(r.count, 1, s);
    assert.ok(r.text.includes(CPR_PLACEHOLDER) && !/\d{4}\b(?! kr)/.test(r.text.replace("Kunde", "")), `${s} → ${r.text}`);
  }
});

await test("leaves phone, CVR, amounts, dates and invalid dates alone", () => {
  for (const s of ["Tlf. 20 30 40 50", "Tlf. 20304050", "CVR 12 34 56 78", "CVR 12345678", "125.000 kr.", "1.234.567,00 kr.", "Dato 12.03.2026", "320385-1234", "121385-1234", "000385-1234", "12038512345", "9912038512", "Tilbud nr. 2026-0412", "Reg. 1234 konto 9876543210"]) {
    assert.equal(maskCpr(s).count, 0, s);
    assert.equal(containsCpr(s), false, s);
  }
});

await test("several CPR numbers in one text are all removed", () => {
  const r = maskCpr("Ejer 120385-1234 og medejer 0101901111");
  assert.equal(r.count, 2);
  assert.ok(!/\d{6}/.test(r.text));
});

await test("the AI's answer is cleaned too (strings anywhere in the object)", () => {
  const out = maskCprDeep({ title: "x", flags: [{ title: "CPR 120385-1234 står i tilbuddet" }], n: 5 });
  assert.equal(out.flags[0].title, `CPR ${CPR_PLACEHOLDER} står i tilbuddet`);
  assert.equal(out.n, 5);
});

await test("PDF with a CPR number: only the cleaned text is sent, never the PDF or the number", async () => {
  const { block, cprHidden } = await quoteContent(await pdf(["Kunde: Jens Hansen, CPR 120385-1234", "Badevaerelse 125.000 kr."]), "application/pdf");
  assert.equal(cprHidden, 1);
  assert.equal(block.type, "text");
  const sent = JSON.stringify(block);
  assert.ok(!sent.includes("120385") && !sent.includes("1234\\n") && sent.includes(CPR_PLACEHOLDER) && sent.includes("125.000 kr."), sent);
});

await test("PDF without a CPR number is sent as the PDF itself (no loss of layout)", async () => {
  const { block, cprHidden } = await quoteContent(await pdf(["Badevaerelse 125.000 kr.", "Tlf. 20 30 40 50"]), "application/pdf");
  assert.equal(cprHidden, 0);
  assert.equal(block.type, "document");
});

await test("photos and unreadable PDFs are passed on unchanged (nothing to read here)", async () => {
  assert.equal((await quoteContent(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg")).block.type, "image");
  const broken = await quoteContent(Buffer.from("%PDF-1.4 broken"), "application/pdf");
  assert.equal(broken.block.type, "document");
  assert.equal(broken.cprHidden, 0);
});

console.log(`\n${passed} tests passed`);
