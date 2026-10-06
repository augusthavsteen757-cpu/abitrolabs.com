import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getQuote } from "@/lib/quotes";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError("Filen blev ikke fundet.", 404);
  let data: Buffer;
  try {
    data = await readStoredFile(quote.fileKey);
  } catch {
    return jsonError("Filen findes ikke længere.", 404);
  }
  const safeName = quote.fileName.replace(/[^\w.\-æøåÆØÅ ]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": quote.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
