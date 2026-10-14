/**
 * Guide articles (Danish). Add an article by adding an object here – the page, metadata, structured data,
 * sitemap entry and "Tjek et tilbud gratis" button come from the template in app/artikler/[slug].
 *
 * draft: true → reachable by its link, but marked "noindex" and left out of the sitemap and the list.
 * Set it to false when the text is written and checked.
 */
export type Article = {
  slug: string;
  /** Page title and H1 – what people search for. Keep it under ~60 characters. */
  title: string;
  /** Shown in Google under the title. Keep it under ~155 characters. */
  description: string;
  /** ISO dates (YYYY-MM-DD). */
  published: string;
  updated: string;
  draft: boolean;
  /** Short intro shown above the sections. */
  intro: string;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
  /** Where facts and prices come from – shown at the bottom. */
  sources?: { label: string; url: string }[];
};

export const ARTICLES: Article[] = [
  {
    slug: "tjek-dit-haandvaerkertilbud",
    title: "Sådan tjekker du et håndværkertilbud",
    description:
      "Fast pris eller overslag, materialer, tidsplan og det, der ikke er med. Se hvad du skal tjekke i et håndværkertilbud, før du skriver under.",
    published: "2026-10-14",
    updated: "2026-10-14",
    draft: false,
    intro: "Et håndværkertilbud kan se klart ud og alligevel gemme udgifter, der først dukker op undervejs. Her er det, du skal kigge efter, før du siger ja.",
    sections: [
      {
        heading: "Fast pris eller overslag?",
        paragraphs: [
          "Det vigtigste er, om der står en fast pris eller et overslag. Et tilbud med fast pris er bindende. Et overslag er et skøn: det må ikke overskrides væsentligt, men der er ingen fast grænse i loven. Bliver det dyrere, skal håndværkeren sige til i god tid.",
          "Står der »timepris«, »efter regning« eller »ca.«, kender du ikke den endelige pris. Bed om fast pris, hvis du kan.",
        ],
      },
      {
        heading: "Hvad er med, og hvad er ikke?",
        paragraphs: ["Mange ekstraregninger kommer fra ting, som ingen skrev ned. Tjek om tilbuddet nævner:"],
        list: [
          "Materialer med type og mængde – ikke bare »diverse materialer«.",
          "Nedrivning, bortskaffelse af affald og oprydning.",
          "Stillads, lift eller containerleje.",
          "Følgearbejde som maling, el eller VVS, hvis det er nødvendigt.",
          "Om prisen er med eller uden moms.",
        ],
      },
      {
        heading: "Forbehold og »efter regning«",
        paragraphs: [
          "Læs forbeholdene. Et forbehold som »skjulte skader afregnes efter regning« kan være rimeligt, men så bør du vide, hvad timeprisen er. Poster uden et fast beløb er dem, der oftest gør regningen større end ventet.",
        ],
      },
      {
        heading: "Tidsplan og betaling",
        paragraphs: [],
        list: [
          "Står der en start- og slutdato?",
          "Hvad sker der, hvis arbejdet bliver forsinket?",
          "Betaler du i rater, der passer til, hvor langt arbejdet er? Betal ikke det hele forud.",
        ],
      },
      {
        heading: "Tjek firmaet",
        paragraphs: [],
        list: [
          "Slå firmaet op på CVR-registret (datacvr.virk.dk).",
          "El, vand, afløb og gas kræver autorisation. Den kan du tjekke hos Sikkerhedsstyrelsen.",
          "Spørg om garanti, og om firmaet er med i en garantiordning eller et ankenævn.",
          "Få altid aftalen skriftligt.",
        ],
      },
      {
        heading: "Sammenlign mindst to tilbud",
        paragraphs: [
          "Sammenlign ikke kun slutprisen. Se om tilbuddene dækker det samme arbejde. Det billigste tilbud kan være billigt, fordi noget mangler.",
        ],
      },
      {
        heading: "Kan man få et tilbud analyseret online?",
        paragraphs: [
          "Ja. På Klardal kan du uploade tilbuddet og få det gennemgået. Du får en oversigt over uklare poster, mulige ekstraudgifter og de spørgsmål, du kan stille håndværkeren. Analysen er et hjælpemiddel og et skøn – tjek altid det originale tilbud, før du skriver under.",
        ],
      },
    ],
    sources: [
      { label: "Bolius: Tilbud fra håndværkere", url: "https://www.bolius.dk/tilbud-fra-haandvaerkere-17194" },
      { label: "Tænk: Dette skal du vide, inden du hyrer en håndværker", url: "https://taenk.dk/forbrugerliv/bolig/dette-skal-du-vide-inden-du-hyrer-en-haandvaerker" },
    ],
  },
  {
    slug: "hvad-koster-et-nyt-badevaerelse",
    title: "Hvad koster et nyt badeværelse i 2026?",
    description:
      "Et nyt badeværelse på ca. 6 m² koster typisk 150.000–210.000 kr. Se hvad der trækker prisen op, og hvad du skal tjekke i tilbuddet.",
    published: "2026-10-12",
    updated: "2026-10-12",
    draft: true,
    intro: "Et nyt badeværelse er en af de dyreste opgaver i et hjem. Her er prisniveauet, hvad der påvirker prisen, og hvad du skal tjekke, før du skriver under.",
    sections: [
      {
        heading: "Hvad koster det?",
        paragraphs: [
          "Et nyt badeværelse på ca. 6 m² koster typisk 150.000–210.000 kr. inkl. moms, ifølge Bolius. Prisen gælder en totalrenovering, hvor det gamle bad rives ned.",
          "Priserne varierer meget fra firma til firma. Få derfor altid mindst tre tilbud.",
        ],
      },
      {
        heading: "Det gør det dyrere",
        paragraphs: [],
        list: [
          "Toilet eller afløb skal flyttes.",
          "Store eller dyre fliser, som tager længere tid at lægge.",
          "Gulvvarme, nye rør eller ny el.",
          "Et lille badeværelse – meget af arbejdet koster det samme uanset størrelse.",
        ],
      },
      {
        heading: "Overslag eller fast pris?",
        paragraphs: [
          "En fast pris er bindende. Et overslag er et skøn: det må ikke overskrides væsentligt, men der er ingen fast grænse i loven. Bliver det dyrere, skal håndværkeren sige til i god tid. Bed om fast pris, hvis du kan.",
        ],
      },
      {
        heading: "Tjek dette i tilbuddet",
        paragraphs: [],
        list: [
          "Poster som »efter regning« eller »diverse« uden et fast beløb.",
          "Om prisen er med eller uden moms.",
          "Om vådrumssikring, bortskaffelse af affald og oprydning er med.",
          "Tidsplan, betalingsplan og garanti.",
        ],
      },
    ],
    sources: [{ label: "Bolius: Hvad koster et nyt badeværelse?", url: "https://www.bolius.dk/hvor-meget-koster-et-nyt-badevaerelse-17458" }],
  },
];

export const publishedArticles = () => ARTICLES.filter((a) => !a.draft);
export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
