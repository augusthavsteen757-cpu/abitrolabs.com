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
    slug: "tilbud-eller-overslag",
    title: "Tilbud eller overslag – hvad er forskellen?",
    description:
      "Et tilbud er en fast pris. Et overslag er et skøn, der kan blive dyrere. Se forskellen, og hvad du kan gøre, hvis prisen stiger.",
    published: "2026-10-14",
    updated: "2026-10-14",
    draft: false,
    intro: "Ordene lyder ens, men de betyder noget vidt forskelligt for, hvad du ender med at betale. Her er forskellen kort fortalt.",
    sections: [
      {
        heading: "Tilbud: en fast pris",
        paragraphs: [
          "Et tilbud er bindende. Siger du ja, skal håndværkeren lave det beskrevne arbejde til den pris, der står. Bliver arbejdet dyrere for håndværkeren, er det som udgangspunkt håndværkerens egen risiko.",
          "Prisen kan dog stige, hvis du selv beder om ekstra arbejde undervejs, eller hvis tilbuddet har forbehold, der bliver aktuelle.",
        ],
      },
      {
        heading: "Overslag: et skøn",
        paragraphs: [
          "Et overslag er håndværkerens bedste bud på prisen. Det er ikke bindende, men det må ikke overskrides væsentligt. Der står ingen fast procentgrænse i loven.",
          "Bygger aftalen på AB-Forbruger, skal håndværkeren spørge dig, før arbejdet fortsætter, hvis prisen ser ud til at blive mere end 15 % højere end overslaget. Gør han ikke det, skal du ikke betale det, du kunne have sparet ved at sige stop.",
        ],
      },
      {
        heading: "Sådan ser du forskel",
        paragraphs: [],
        list: [
          "»Tilbud«, »fast pris« eller »fastpris« betyder normalt, at prisen ligger fast.",
          "»Overslag«, »ca.«, »anslået« eller »vejledende« betyder, at prisen kan ændre sig.",
          "»Efter regning« eller »timepris« betyder, at du betaler for den tid og de materialer, der bliver brugt.",
          "Står der både en samlet pris og »ca.«, så spørg, hvad det er.",
        ],
      },
      {
        heading: "Hvad skal du vælge?",
        paragraphs: [
          "Bed om et tilbud med fast pris, når det er muligt. Så ved du, hvad det koster. Ved arbejde, hvor ingen kan se, hvad der gemmer sig bag væggen, kan et overslag være rimeligt. Aftal så, at håndværkeren siger til, før prisen løber over.",
        ],
      },
      {
        heading: "Usikker på, hvad dit tilbud er?",
        paragraphs: [
          "Upload tilbuddet på Klardal. Så får du at vide, om det ligner en fast pris eller et overslag, og hvilke poster der kan gøre det dyrere. Analysen er et skøn – tjek altid det originale tilbud.",
        ],
      },
    ],
    sources: [
      { label: "Bolius: Overslag fra håndværker – hvor meget må prisen svinge?", url: "https://www.bolius.dk/overslag-fra-haandvaerker-hvor-meget-maa-prisen-svinge-89637" },
      { label: "Bolius: Tilbud fra håndværkere og håndværkeraftaler", url: "https://www.bolius.dk/tilbud-fra-haandvaerkere-og-haandvaerkeraftaler-17194" },
    ],
  },
  {
    slug: "efter-regning",
    title: "Hvad betyder »efter regning« i et tilbud?",
    description:
      "»Efter regning« betyder, at du betaler for de timer og materialer, der bliver brugt. Se hvad du skal aftale, så regningen ikke løber løbsk.",
    published: "2026-10-14",
    updated: "2026-10-14",
    draft: false,
    intro: "»Efter regning« er en af de poster, der oftest gør en håndværkerregning større end ventet. Her er, hvad det betyder, og hvordan du holder styr på det.",
    sections: [
      {
        heading: "Hvad betyder det?",
        paragraphs: [
          "Arbejde efter regning betyder, at du betaler for den tid, håndværkeren bruger, plus materialer og evt. kørsel. Der er ingen fast pris, så du kender ikke det endelige beløb, før arbejdet er færdigt.",
          "Der er ikke noget galt i regningsarbejde, men prisen skal være rimelig i forhold til arbejdet.",
        ],
      },
      {
        heading: "Hvorfor er det en risiko?",
        paragraphs: [
          "Timerne kan løbe op, og det er svært for dig at vide, om tidsforbruget er rimeligt. Står der fx »diverse materialer efter forbrug« eller »uforudsete arbejder efter regning«, kan det være en stor del af den samlede pris.",
        ],
      },
      {
        heading: "Det kan du aftale",
        paragraphs: [],
        list: [
          "Bed om fast pris på så meget som muligt.",
          "Få timeprisen skrevet ind, også for lærlinge og kørsel.",
          "Bed om et overslag over, hvor mange timer det tager.",
          "Aftal, at håndværkeren skal spørge dig, før der laves ekstra arbejde.",
          "Bed om en regning, der viser timer, timepris og materialer.",
        ],
      },
      {
        heading: "Tjek dit tilbud",
        paragraphs: [
          "På Klardal kan du uploade tilbuddet og se, hvilke poster der er efter regning eller uden et fast beløb. Analysen er et skøn – tjek altid det originale tilbud.",
        ],
      },
    ],
    sources: [
      { label: "Bolius: Tilbud fra håndværkere og håndværkeraftaler", url: "https://www.bolius.dk/tilbud-fra-haandvaerkere-og-haandvaerkeraftaler-17194" },
      { label: "Bolius: Forbrugeraftale ved håndværkerarbejde", url: "https://www.bolius.dk/forbrugeraftale-ved-haandvaerkerarbejde-17817" },
    ],
  },
  {
    slug: "sammenlign-haandvaerkertilbud",
    title: "Sådan sammenligner du håndværkertilbud",
    description:
      "Det billigste tilbud er ikke altid billigst. Se hvordan du sammenligner håndværkertilbud, så du ved, at de dækker det samme arbejde.",
    published: "2026-10-14",
    updated: "2026-10-14",
    draft: false,
    intro: "Har du fået to eller tre tilbud, er det fristende bare at tage det billigste. Men tilbud dækker sjældent præcis det samme. Sådan sammenligner du dem.",
    sections: [
      {
        heading: "1. Sæt dem op side om side",
        paragraphs: [
          "Skriv posterne fra hvert tilbud op i en liste: nedrivning, materialer, arbejdsløn, affald, stillads, oprydning. Så kan du se, hvad det ene tilbud har med, som det andet mangler.",
        ],
      },
      {
        heading: "2. Tjek prisformen",
        paragraphs: [
          "Er det en fast pris, et overslag eller efter regning? Et overslag på 80.000 kr. kan ende dyrere end et tilbud på 90.000 kr. med fast pris.",
        ],
      },
      {
        heading: "3. Læg det, der mangler, til",
        paragraphs: [
          "Mangler bortskaffelse af affald i det ene tilbud, så spørg, hvad det koster, og læg det til. Først da kan du sammenligne prisen.",
        ],
      },
      {
        heading: "4. Sammenlign materialerne",
        paragraphs: [
          "To tilbud på et nyt badeværelse kan have vidt forskellige fliser, armaturer og membraner. Står der bare »fliser efter aftale«, så spørg, hvad der er regnet med.",
        ],
      },
      {
        heading: "5. Se på mere end prisen",
        paragraphs: [],
        list: [
          "Hvornår kan de starte, og hvornår er de færdige?",
          "Hvordan skal du betale undervejs?",
          "Hvilken garanti får du?",
          "Har firmaet de autorisationer, opgaven kræver?",
        ],
      },
      {
        heading: "Få hjælp til at sammenligne",
        paragraphs: [
          "På Klardal kan du uploade flere tilbud og se dem side om side, med de poster der er uklare eller mangler. Analysen er et skøn – tjek altid de originale tilbud.",
        ],
      },
    ],
    sources: [
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
