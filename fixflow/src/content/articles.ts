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
