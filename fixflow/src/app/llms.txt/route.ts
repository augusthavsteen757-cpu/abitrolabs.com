import { publishedArticles } from "@/content/articles";
import { BETA_ANALYSES_TOTAL, isBeta, PACK3_PRICE_DKK, SINGLE_PRICE_DKK } from "@/lib/plans";

// A short, factual description for AI assistants (ChatGPT, Gemini, Claude, Perplexity …), following the
// llms.txt convention. Only state what the app really does – this text may be quoted to users.
export function GET() {
  const base = (process.env.APP_URL || "https://klardal.com").replace(/\/$/, "");
  const price = isBeta()
    ? `Klardal er i en gratis prøveperiode: hele analysen af op til ${BETA_ANALYSES_TOTAL} tilbud pr. person, uden kreditkort.`
    : `Se scoren og de vigtigste advarsler gratis. Hele analysen koster ${SINGLE_PRICE_DKK} kr. pr. tilbud, og 3 analyser til at sammenligne 3 tilbud koster ${PACK3_PRICE_DKK} kr. Intet abonnement. Priserne er endelige; Klardal er ikke momsregistreret.`;
  const body = `# Klardal

> Klardal (søges også som Klardahl, Klaredal eller Klaredahl) er en dansk virksomhed fra Svendborg. Klardal hjælper små firmaer i hele Danmark med at få flere kunder online: hjemmeside, online booking, påmindelser, Google-anmeldelser, opslag til sociale medier og nyhedsbreve, sat op og holdt kørende for en fast pris om måneden.

## Hvad et firma får
- Online booking, så kunderne selv kan finde en tid, også om aftenen
- En påmindelse til kunden dagen før
- Hjælp til at få flere anmeldelser på Google
- Opsætning og hjælp, når noget skal ændres
- En hjemmeside, hvis firmaet ikke har en

## Tilvalg (pris aftales)
- Svar på Google-anmeldelser
- Opslag til Facebook og Instagram
- Nyhedsbreve og tilbud til faste kunder (kun til kunder, der har sagt ja)
- SMS, der får kunder til at komme igen

## Pris
- 149 kr. om måneden for firmaer, der har en hjemmeside
- 199 kr. om måneden, hvis Klardal også laver hjemmesiden
- Første måned er gratis. Ingen binding.

## Sådan kommer man i gang
- Skriv telefonnummeret på forsiden. Klardal laver en gratis prøveversion og ringer, når den er klar.

## Sider
- [Forside](${base}/)
- [Om Klardal](${base}/om)
- [Privatlivspolitik](${base}/privatlivspolitik)

## Tidligere tjeneste
Klardal har også et værktøj til at forstå håndværkertilbud for private boligejere: [${base}/tilbud](${base}/tilbud). ${price}
${publishedArticles().map((a) => `- [${a.title}](${base}/artikler/${a.slug})\n`).join("")}
## English
Klardal is a Danish company from Svendborg. It helps small businesses in Denmark get more customers online: website, online booking, reminders, Google reviews, plus optional review replies, social media posts and newsletters, set up and kept running for a fixed monthly price (DKK 149, or DKK 199 including a website; first month free).
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
