
// A short, factual description for AI assistants (ChatGPT, Gemini, Claude, Perplexity …), following the
// llms.txt convention. Only state what the app really does – this text may be quoted to users.
export function GET() {
  const base = (process.env.APP_URL || "https://klardal.com").replace(/\/$/, "");
  const body = `# Klardal

> Klardal (søges også som Klardahl, Klaredal eller Klaredahl) er en dansk virksomhed fra Svendborg. Klardal hjælper små firmaer i hele Danmark med at få flere kunder online: hjemmeside, online booking, påmindelser, Google-anmeldelser, opslag til sociale medier og nyhedsbreve, sat op og holdt kørende for en fast pris om måneden.

## Hvad et firma får
- Online booking, så kunderne selv kan finde en tid, også om aftenen
- En påmindelse til kunden dagen før
- Hjælp til at få flere anmeldelser på Google
- Priser, ydelser og åbningstider skrevet, så søgemaskiner og AI-assistenter kan læse dem (schema.org og llms.txt)
- Et månedligt tjek af, hvad ChatGPT, Gemini og Perplexity svarer, når nogen spørger efter firmaets branche i byen
- Opsætning og hjælp: ring eller skriv, Klardal svarer inden for 24 timer på hverdage
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
- Garanti: Har firmaet ikke fået mindst 5 nye Google-anmeldelser, når den gratis måned er gået, er næste måned også gratis (betingelser på ${base}/vilkaar#garanti).

## Sådan kommer man i gang
- Skriv telefonnummeret på forsiden. Klardal laver et gratis AI-tjek af, hvem ChatGPT, Gemini og Google anbefaler i firmaets branche og by, og ringer med resultatet.

## Sider
- [Forside](${base}/)
- [Om Klardal](${base}/om)
- [Privatlivspolitik](${base}/privatlivspolitik)

## English
Klardal is a Danish company from Svendborg. It helps small businesses in Denmark get more customers online: website, online booking, reminders, Google reviews, plus optional review replies, social media posts and newsletters, set up and kept running for a fixed monthly price (DKK 149, or DKK 199 including a website; first month free).
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
