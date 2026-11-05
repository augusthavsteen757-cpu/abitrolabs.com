import { firmaLlmsTxt } from "@/lib/firma-profil";
import { kundeOf, kundeUrl } from "@/lib/kunder";

// A customer's facts for AI assistants, e.g. klardal.com/firma/<slug>/llms.txt
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = kundeOf(slug);
  if (!p) return new Response("Ikke fundet\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const headers: Record<string, string> = { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" };
  if (p.eksempel) headers["x-robots-tag"] = "noindex";
  return new Response(firmaLlmsTxt(p, kundeUrl(slug)), { headers });
}
