import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Minimal file storage on local disk. Keep this interface stable so it can be
 * swapped for S3 / Cloudflare R2 later (saveFile / readStoredFile / deleteStoredFile).
 */

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
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function deleteStoredFile(key: string): Promise<void> {
  try {
    await unlink(resolveKey(key));
  } catch {
    // Already gone – nothing to do.
  }
}
