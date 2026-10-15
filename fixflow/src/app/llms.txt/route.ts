import { publishedArticles } from "@/content/articles";
import { BETA_ANALYSES_TOTAL, isBeta, PACK3_PRICE_DKK, SINGLE_PRICE_DKK } from "@/lib/plans";

// A short, factual description for AI assistants (ChatGPT, Gemini, Claude, Perplexity …), following the
// llms.txt convention. Only state what the app really does – this text may be quoted to users.
export function GET() {
  const base = (process.env.APP_URL || "https://klardal.com").replace(/\/$/, "");
  const price = isBeta()
    ? `Klardal er i en gratis prøveperiode: hele analysen af op til ${BETA_ANALYSES_TOTAL} tilbud pr. person, uden kreditkort.`
    : `Se scoren og halvdelen af analysen gratis. Hele analysen koster ${SINGLE_PRICE_DKK} kr. pr. tilbud, og 3 analyser til at sammenligne 3 tilbud koster ${PACK3_PRICE_DKK} kr. Intet abonnement. Priserne er endelige; Klardal er ikke momsregistreret.`;
  const body = `# Klardal

> Klardal (søges også som Klardahl, Klaredal eller Klaredahl) forklarer håndværkertilbud for private boligejere i Danmark. Man uploader tilbuddet (PDF eller foto) og får på typisk under et minut et overblik på almindeligt dansk – eller på engelsk, tysk, svensk, norsk, polsk, rumænsk eller ukrainsk.

## Hvad man får
- Et tal fra 0 til 100 for, hvor klart tilbuddet er, og én sætning om, hvad man bør gøre
- Hvad der kan gøre regningen dyrere, fx "efter regning", "diverse" og poster uden pris
- Hvad der mangler, fx bortskaffelse af affald, tidsplan eller garanti
- Hvilke danske regler og vilkår, der er relevante (fx AB-Forbruger og Byggeriets Ankenævn)
- Spørgsmål til håndværkeren og en færdig besked, man kan sende
- Flere tilbud side om side

## Vigtigt
- Analysen laves med AI, er vejledende og erstatter ikke juridisk eller teknisk rådgivning.
- Klardal sælger ikke håndværkerydelser og får ikke betaling fra håndværkere.

## Pris
- ${price}

## Sider
- [Forside](${base}/)
- [Priser](${base}/priser)
- [Opret konto](${base}/opret)
- [Handelsbetingelser](${base}/handelsbetingelser)
- [Privatlivspolitik](${base}/privatlivspolitik)
${publishedArticles().map((a) => `- [${a.title}](${base}/artikler/${a.slug})\n`).join("")}
## English
Klardal explains contractor quotes for homeowners in Denmark: upload a quote and get a clarity score, possible extra costs, what is missing, relevant Danish rules, and ready-made questions for the contractor – in 8 languages.
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
