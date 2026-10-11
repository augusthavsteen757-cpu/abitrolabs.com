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
  sections: { heading: string; paragraphs: string[] }[];
};

export const ARTICLES: Article[] = [
  {
    slug: "hvad-koster-et-nyt-badevaerelse",
    title: "Hvad koster et nyt badeværelse i 2026?",
    description:
      "Pladsholder: hvad et nyt badeværelse typisk koster, hvad prisen afhænger af, og hvad du skal tjekke i tilbuddet, før du skriver under.",
    published: "2026-10-11",
    updated: "2026-10-11",
    draft: true,
    intro: "PLADSHOLDER – August skriver indholdet. Kort indledning: hvem artiklen er til, og hvad man får svar på.",
    sections: [
      {
        heading: "Hvad koster et nyt badeværelse?",
        paragraphs: ["PLADSHOLDER: prisniveau med kilde (fx priser fra brancheorganisationer), og hvad der typisk er med."],
      },
      {
        heading: "Hvad påvirker prisen?",
        paragraphs: ["PLADSHOLDER: størrelse, fliser, VVS, el, vådrumssikring, nedrivning og bortskaffelse."],
      },
      {
        heading: "Overslag eller fast pris?",
        paragraphs: ["PLADSHOLDER: forskellen, og hvad det betyder, hvis prisen stiger."],
      },
      {
        heading: "Det skal du tjekke i tilbuddet",
        paragraphs: ["PLADSHOLDER: poster som »efter regning« og »diverse«, moms, tidsplan, garanti og betalingsplan."],
      },
    ],
  },
];

export const publishedArticles = () => ARTICLES.filter((a) => !a.draft);
export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
