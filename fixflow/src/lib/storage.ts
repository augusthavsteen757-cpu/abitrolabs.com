import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fileChunks } from "@/db/schema";

/**
 * Minimal file storage behind a stable interface (saveFile / readStoredFile / deleteStoredFile).
 * Two drivers:
 *   - "disk": local folder (UPLOAD_DIR) – Docker with a volume, local development.
 *   - "db":   chunks in the database – hosts without a permanent disk (Render free + Turso).
 * STORAGE_DRIVER picks one; default is "db" when DATABASE_URL points to a remote database, else "disk".
 */
const DRIVER =
  process.env.STORAGE_DRIVER === "db" || process.env.STORAGE_DRIVER === "disk"
    ? process.env.STORAGE_DRIVER
    : (process.env.DATABASE_URL || "file:").startsWith("file:")
      ? "disk"
      : "db";
const CHUNK = 512 * 1024;

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ROOT = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

function resolveKey(key: string): string {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(pdf|jpg|png|webp)$/.test(key)) {
    throw new Error("Ugyldig filnøgle");
  }
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Ugyldig filsti");
  return full;
}

/** Sniffs magic bytes so a renamed file can't pretend to be a PDF/image. */
export function detectMimeType(buf: Buffer): string | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP")
    return "image/webp";
  return null;
}

export async function saveFile(userId: string, data: Buffer, mimeType: string): Promise<string> {
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) throw new Error("Filtypen understøttes ikke");
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, "");
  const key = `${safeUser}/${randomBytes(16).toString("base64url")}.${ext}`;
  if (DRIVER === "db") {
    resolveKey(key);
    for (let i = 0; i * CHUNK < data.length; i++) {
      await db.insert(fileChunks).values({ key, idx: i, data: data.subarray(i * CHUNK, (i + 1) * CHUNK) });
    }
    return key;
  }
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const full = resolveKey(key);
  if (DRIVER === "db") {
    const rows = await db.select().from(fileChunks).where(eq(fileChunks.key, key)).orderBy(asc(fileChunks.idx));
    if (!rows.length) throw new Error("Filen findes ikke");
    return Buffer.concat(rows.map((r) => Buffer.from(r.data)));
  }
  return readFile(full);
}

export async function deleteStoredFile(key: string): Promise<void> {
  if (DRIVER === "db") {
    await db.delete(fileChunks).where(eq(fileChunks.key, key)).catch(() => undefined);
    return;
  }
  try {
    await unlink(resolveKey(key));
  } catch {
    // Already gone – nothing to do.
  }
}
