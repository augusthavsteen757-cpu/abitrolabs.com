/**
 * Seeds the database with a demo user and generates 4 FICTIONAL quote PDFs in sample-quotes/.
 * Run with: npm run db:seed  (after npm run db:push)
 */
import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "../src/db";
import { contractorMessages, payments, quotes, rateLimits, users } from "../src/db/schema";
import { DEMO_QUOTES, type DemoQuote } from "../src/lib/demo-data";
import { normalizeAnalysis } from "../src/lib/analysis";
import { computeScore } from "../src/lib/score";
import { deleteStoredFile, saveFile } from "../src/lib/storage";

const OUT_DIR = path.resolve("sample-quotes");
const kr = (n: number) =>
  new Intl.NumberFormat("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const dato = (iso: string | null) => (iso ? new Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(new Date(iso)) : "");

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function renderPdf(q: DemoQuote): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${q.raw.title} – ${q.raw.contractor.name} (FIKTIVT EKSEMPEL)`);
  doc.setAuthor("Klardal demo");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.13, 0.11);
  const muted = rgb(0.42, 0.47, 0.45);
  const green = rgb(0.11, 0.34, 0.27);

  let page: PDFPage = doc.addPage([595, 842]);
  const watermark = (p: PDFPage) =>
    p.drawText("FIKTIVT EKSEMPEL", { x: 110, y: 300, size: 60, font: bold, color: rgb(0.85, 0.2, 0.2), opacity: 0.12, rotate: degrees(35) });
  watermark(page);
  let y = 790;
  const L = 50;
  const R = 545;
  const newPageIfNeeded = (need: number) => {
    if (y - need < 60) {
      page = doc.addPage([595, 842]);
      watermark(page);
      y = 790;
    }
  };

  page.drawText(q.raw.contractor.name, { x: L, y, size: 18, font: bold, color: green });
  y -= 18;
  page.drawText(q.contractorAddress, { x: L, y, size: 9, font, color: muted });
  y -= 12;
  const contact = [
    q.raw.contractor.cvr ? `CVR ${q.raw.contractor.cvr}` : null,
    q.raw.contractor.phone ? `Tlf. ${q.raw.contractor.phone}` : null,
    q.raw.contractor.email,
  ]
    .filter(Boolean)
    .join("  ·  ");
  page.drawText(contact, { x: L, y, size: 9, font, color: muted });
  page.drawText("FIKTIVT EKSEMPEL – til test af Klardal", { x: R - font.widthOfTextAtSize("FIKTIVT EKSEMPEL – til test af Klardal", 8), y: 800, size: 8, font, color: rgb(0.8, 0.2, 0.2) });

  y -= 40;
  const docType = q.raw.priceType === "overslag" ? "OVERSLAG" : "TILBUD";
  page.drawText(docType, { x: L, y, size: 22, font: bold, color: ink });
  y -= 22;
  page.drawText(q.raw.title, { x: L, y, size: 13, font, color: ink });
  y -= 26;
  page.drawText(`Til: ${q.customer}`, { x: L, y, size: 10, font, color: ink });
  y -= 14;
  page.drawText(`Dato: ${dato(q.raw.quoteDate)}`, { x: L, y, size: 10, font, color: ink });
  y -= 30;

  // Table header
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 22, color: rgb(0.93, 0.97, 0.95) });
  page.drawText("Beskrivelse", { x: L + 8, y, size: 10, font: bold, color: ink });
  page.drawText("Beløb ekskl. moms", { x: R - 8 - bold.widthOfTextAtSize("Beløb ekskl. moms", 10), y, size: 10, font: bold, color: ink });
  y -= 24;

  for (const item of q.raw.lineItems) {
    let desc = item.description;
    if (item.quantity != null && item.unitPrice != null && !desc.includes(`${item.quantity} ${item.unit}`)) desc += ` (${item.quantity} ${item.unit ?? ""} á ${kr(item.unitPrice)} kr.)`;
    const lines = wrap(desc, font, 10, 360);
    newPageIfNeeded(lines.length * 13 + 10);
    lines.forEach((ln, i) => page.drawText(ln, { x: L + 8, y: y - i * 13, size: 10, font, color: ink }));
    const amt = `${kr(item.amount)} kr.`;
    page.drawText(amt, { x: R - 8 - font.widthOfTextAtSize(amt, 10), y, size: 10, font, color: ink });
    y -= lines.length * 13 + 8;
    page.drawLine({ start: { x: L, y: y + 4 }, end: { x: R, y: y + 4 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.85) });
    y -= 4;
  }

  y -= 10;
  newPageIfNeeded(70);
  const totals: [string, number, boolean][] = [
    ["I alt ekskl. moms", q.raw.totals.exclVat, false],
    ["Moms 25 %", q.raw.totals.vat, false],
    ["I alt inkl. moms", q.raw.totals.inclVat, true],
  ];
  for (const [label, val, strong] of totals) {
    const f = strong ? bold : font;
    page.drawText(label, { x: 320, y, size: 11, font: f, color: ink });
    const s = `${kr(val)} kr.`;
    page.drawText(s, { x: R - 8 - f.widthOfTextAtSize(s, 11), y, size: 11, font: f, color: ink });
    y -= 17;
  }

  y -= 20;
  newPageIfNeeded(30);
  page.drawText("Betingelser", { x: L, y, size: 12, font: bold, color: ink });
  y -= 18;
  for (const t of q.pdfTerms) {
    const lines = wrap(`•  ${t}`, font, 10, R - L - 10);
    newPageIfNeeded(lines.length * 13 + 4);
    lines.forEach((ln, i) => page.drawText(ln, { x: L + 4, y: y - i * 13, size: 10, font, color: ink }));
    y -= lines.length * 13 + 4;
  }

  y -= 24;
  newPageIfNeeded(40);
  page.drawText("Med venlig hilsen", { x: L, y, size: 10, font, color: ink });
  y -= 14;
  page.drawText(q.raw.contractor.name, { x: L, y, size: 10, font: bold, color: ink });

  return doc.save();
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) {
    throw new Error("Seed er slået fra i produktion (demo-brugeren har en svag adgangskode). Sæt ALLOW_DEMO_SEED=1 hvis du er sikker.");
  }
  await mkdir(OUT_DIR, { recursive: true });
  const pdfs = new Map<string, Buffer>();
  for (const q of DEMO_QUOTES) {
    const bytes = Buffer.from(await renderPdf(q));
    pdfs.set(q.slug, bytes);
    await writeFile(path.join(OUT_DIR, q.fileName), bytes);
    const a = normalizeAnalysis(q.raw);
    console.log(`  ✓ ${q.fileName}  (score ${computeScore(a).total})`);
  }

  await db.delete(rateLimits); // fresh counters for local testing
  const email = "demo@klardal.dk";
  // Remove any previous demo user explicitly (don't rely on SQLite's foreign_keys pragma).
  const old = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (old) {
    const oldQuotes = await db.query.quotes.findMany({ where: eq(quotes.userId, old.id) });
    for (const q of oldQuotes) {
      await db.delete(contractorMessages).where(eq(contractorMessages.quoteId, q.id));
      await deleteStoredFile(q.fileKey);
    }
    await db.delete(quotes).where(eq(quotes.userId, old.id));
    await db.delete(payments).where(eq(payments.userId, old.id));
    await db.delete(users).where(eq(users.id, old.id));
  }
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: "Demo Jensen",
      passwordHash: await bcrypt.hash("demo1234", 10),
      plan: "PRO",
      postalCode: "4000",
      acceptedTermsAt: new Date(),
      periodStart: new Date(),
      periodUsed: 3,
    })
    .returning();

  await db.insert(payments).values({ userId: user.id, kind: "PRO_MONTHLY", amountDkk: 49, provider: "simulated", reference: `sim_seed_${user.id}` });

  const bathroom = DEMO_QUOTES.filter((q) => q.projectName === "Nyt badeværelse");
  const created: Record<string, string> = {};
  let minutesAgo = 60 * 24 * 3;
  for (const q of bathroom) {
    const normalized = normalizeAnalysis(q.raw);
    const analysis = { ...normalized, score: computeScore(normalized) };
    const fileKey = await saveFile(user.id, pdfs.get(q.slug)!, "application/pdf");
    const at = new Date(Date.now() - minutesAgo * 60_000);
    minutesAgo -= 60 * 20;
    const [row] = await db
      .insert(quotes)
      .values({
        userId: user.id,
        projectName: q.projectName,
        fileName: q.fileName,
        fileKey,
        mimeType: "application/pdf",
        fileSize: pdfs.get(q.slug)!.length,
        status: "DONE",
        contractorName: analysis.contractor.name,
        title: analysis.title,
        totalInclVat: analysis.totals.inclVat,
        score: analysis.score.total,
        analysisJson: JSON.stringify(analysis),
        unlocked: true,
        createdAt: at,
        updatedAt: at,
      })
      .returning();
    created[q.slug] = row.id;
  }

  await db.insert(contractorMessages).values({
    quoteId: created["eksempel-vvs"],
    topic: "Materialer for 32.000 kr. er ikke specificeret",
    body:
      "Hej Eksempel VVS ApS\n\nTusind tak for jeres overslag af 2. september på renovering af badeværelset. Det ser fornuftigt ud, og vi har et enkelt spørgsmål, inden vi beslutter os.\n\nPosten \"Materialer iht. aftale\" på 32.000 kr. ekskl. moms er ikke beskrevet nærmere. Vil I sende en liste over, hvad den dækker – fx fliser, toilet, armaturer og membran med mærke og mængde?\n\nSå er vi helt trygge ved at gå videre.\n\nMange venlige hilsner\nDemo Jensen",
  });

  console.log(`\n  Demo-bruger: ${email} / demo1234 (Pro, ${bathroom.length} tilbud i "Nyt badeværelse")`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
