/**
 * Hand-written example analyses used by demo mode (no ANTHROPIC_API_KEY) and by
 * the seed script, which also renders matching fictional PDF quotes from them.
 * All companies, CVR numbers and contact details are FICTIONAL.
 */
import type { CheckKey, LineItem, Flag, Question, PriceType, RuleKey } from "./analysis";

export type DemoQuote = {
  slug: string;
  keywords: string[];
  fileName: string;
  projectName: string;
  /** Extra lines printed on the fictional PDF (terms etc.) */
  pdfTerms: string[];
  contractorAddress: string;
  customer: string;
  raw: {
    contractor: { name: string; cvr: string | null; phone: string | null; email: string | null; address: string | null };
    title: string;
    quoteDate: string | null;
    validUntil: string | null;
    priceType: PriceType;
    totals: { exclVat: number; vat: number; inclVat: number };
    summary: string;
    lineItems: LineItem[];
    flags: Flag[];
    checks: { key: CheckKey; present: boolean; note: string }[];
    questions: Question[];
    extraCostRisk: { min: number; max: number; explanation: string };
    currency: string;
    language: string;
    rules: { key: RuleKey; status: "ok" | "missing" | "unclear" | "not_relevant"; note: string }[];
    priceLevel: { level: "lav" | "normal" | "hoej" | "ukendt"; explanation: string };
  };
};

const li = (
  description: string,
  category: LineItem["category"],
  amount: number,
  clarity: LineItem["clarity"],
  explanation: string,
  opts: Partial<Pick<LineItem, "quantity" | "unit" | "unitPrice" | "note">> = {},
): LineItem => ({
  description,
  category,
  amount,
  clarity,
  explanation,
  quantity: opts.quantity ?? null,
  unit: opts.unit ?? null,
  unitPrice: opts.unitPrice ?? null,
  note: opts.note ?? null,
});

export const DEMO_QUOTES: DemoQuote[] = [
  {
    slug: "hansen",
    keywords: ["hansen", "soen", "søn", "vvs-byg"],
    fileName: "hansen-soen-badevaerelse.pdf",
    projectName: "Nyt badeværelse",
    contractorAddress: "Industrivej 14, 4000 Roskilde",
    customer: "Familien Jensen, Søndergade 8, 4000 Roskilde",
    pdfTerms: [
      "Prisen er et overslag og kan ændre sig afhængigt af forholdene.",
      "El-arbejde afregnes efter forbrug.",
      "Fakturering sker a conto hver 14. dag.",
      "Tilbuddet er gældende i 14 dage.",
    ],
    raw: {
      contractor: { name: "Hansen & Søn VVS-Byg ApS", cvr: "39 21 48 57", phone: "46 12 34 56", email: "tilbud@hansensoen.example", address: "Industrivej 14, 4000 Roskilde" },
      title: "Renovering af badeværelse",
      quoteDate: "2026-09-02",
      validUntil: "2026-09-16",
      priceType: "overslag",
      totals: { exclVat: 128400, vat: 32100, inclVat: 160500 },
      summary:
        "Hansen & Søn giver et overslag på 160.500 kr. inkl. moms for at rive det gamle badeværelse ned og bygge et nyt med nye rør, fliser og el. Det er et overslag, så den endelige pris er ikke bindende og kan blive højere. En stor del af beløbet – 40.500 kr. ekskl. moms – ligger i to poster, der ikke er beskrevet: \"Materialer iht. aftale\" og \"Diverse arbejde\". El-arbejdet afregnes efter forbrug, og der står intet om bortskaffelse, tidsplan eller garanti. Bed om en mere detaljeret specifikation, før du skriver under.",
      lineItems: [
        li("Nedrivning af eksisterende badeværelse", "Arbejdsløn", 14500, "clear", "Fjernelse af gamle fliser, toilet, håndvask og bruseniche, så rummet står klar til opbygning."),
        li("Afdækning og opsætning af støvvæg", "Arbejdsløn", 5200, "clear", "Beskyttelse af gang og tilstødende rum mod støv og skader under arbejdet."),
        li("VVS-arbejde, nye rør og afløb", "Arbejdsløn", 28600, "vague", "Udskiftning af vandrør og afløb. Der står ikke, hvor mange timer der er regnet med, eller hvilke rør og hvilket gulvafløb der bruges.", { note: "Antal timer og materialetype mangler" }),
        li("Flisearbejde gulv og væg, 18 m²", "Arbejdsløn", 24800, "clear", "Opsætning af fliser på gulv og vægge. Ca. 1.378 kr. pr. m² for arbejdet.", { quantity: 18, unit: "m²", unitPrice: 1378 }),
        li("Materialer iht. aftale", "Materialer", 32000, "unclear", "Det fremgår ikke, hvilke materialer du får for pengene – fx fliser, toilet, armaturer eller membran. Du kan ikke kontrollere, om prisen er rimelig.", { note: "Ingen specifikation" }),
        li("Diverse arbejde", "Diverse", 8500, "unclear", "En samlepost uden beskrivelse. Du ved ikke, hvad du betaler for.", { note: "Ingen beskrivelse" }),
        li("El-arbejde efter forbrug (anslået)", "Arbejdsløn", 12000, "vague", "Elektrikerens arbejde med lys, stikkontakter og evt. gulvvarme. Beløbet er kun et skøn – du betaler for de faktiske timer.", { note: "Afregnes efter forbrug" }),
        li("Kørsel", "Kørsel", 2800, "clear", "Transport af folk og materialer til og fra adressen."),
      ],
      flags: [
        {
          severity: "high",
          type: "hidden_cost",
          title: "El-arbejdet afregnes efter forbrug",
          explanation: "De 12.000 kr. til el er kun et skøn. Afregnes der efter forbrug, er der intet loft over prisen. Bed om en fast pris eller et maksimum.",
          relatedItem: "El-arbejde efter forbrug (anslået)",
          estimatedExtraMin: 3000,
          estimatedExtraMax: 10000,
        },
        {
          severity: "high",
          type: "vague_item",
          title: "Materialer for 32.000 kr. er ikke specificeret",
          explanation: "Posten \"Materialer iht. aftale\" er tilbuddets største enkeltpost, men der står ikke, hvad den dækker. Uden en liste kan du ikke sammenligne med andre tilbud, og der kan komme tillæg for materialer, du troede var med.",
          relatedItem: "Materialer iht. aftale",
          estimatedExtraMin: 2000,
          estimatedExtraMax: 10000,
        },
        {
          severity: "medium",
          type: "vague_item",
          title: "\"Diverse arbejde\" uden beskrivelse",
          explanation: "8.500 kr. til \"diverse\" er en samlepost uden indhold. Spørg, hvilke konkrete opgaver beløbet dækker.",
          relatedItem: "Diverse arbejde",
          estimatedExtraMin: 0,
          estimatedExtraMax: 4000,
        },
        {
          severity: "medium",
          type: "missing_info",
          title: "Bortskaffelse af affald er ikke nævnt",
          explanation: "Nedrivning af et badeværelse giver flere kubikmeter affald. Står bortskaffelse ikke i tilbuddet, kan den komme som en ekstraregning – typisk 3.000–5.000 kr.",
          relatedItem: null,
          estimatedExtraMin: 3000,
          estimatedExtraMax: 5000,
        },
        {
          severity: "medium",
          type: "terms",
          title: "Det er et overslag – ikke en fast pris",
          explanation: "Et overslag er ikke bindende. Efter almindelig praksis må det normalt ikke overskrides væsentligt (ofte 10–15 %), men du har ikke samme sikkerhed som ved en fast pris.",
          relatedItem: null,
          estimatedExtraMin: null,
          estimatedExtraMax: null,
        },
      ],
      checks: [
        { key: "cvr", present: true, note: "CVR 39 21 48 57 står i sidehovedet." },
        { key: "validity", present: true, note: "Gælder i 14 dage." },
        { key: "timeline", present: false, note: "Ingen start- eller slutdato." },
        { key: "payment", present: true, note: "A conto-fakturering hver 14. dag." },
        { key: "vat", present: true, note: "Priser er angivet ekskl. moms med moms lagt til i bunden." },
        { key: "materials", present: false, note: "Materialer er samlet i én post uden specifikation." },
        { key: "hourly", present: false, note: "Ingen timepris, selv om el afregnes efter forbrug." },
        { key: "unforeseen", present: false, note: "Ikke beskrevet." },
        { key: "cleanup", present: false, note: "Bortskaffelse og oprydning er ikke nævnt." },
        { key: "warranty", present: false, note: "Ingen garanti, forsikring eller ankenævn nævnt." },
      ],
      questions: [
        { question: "Kan I sende en liste over, hvad \"Materialer iht. aftale\" til 32.000 kr. dækker – med mærke, model og mængde?", why: "Det er tilbuddets største post, og uden en liste kan du ikke sammenligne prisen.", priority: "high" },
        { question: "Kan el-arbejdet laves til fast pris, eller kan I sætte et loft over de 12.000 kr.?", why: "Efter forbrug betyder, at regningen kan blive højere uden varsel.", priority: "high" },
        { question: "Hvilke opgaver dækker \"Diverse arbejde\" til 8.500 kr.?", why: "Du bør vide, hvad du betaler for.", priority: "medium" },
        { question: "Er bortskaffelse af byggeaffald inkluderet i prisen? Hvis ikke, hvad koster det?", why: "Affald fra et badeværelse er en typisk ekstraregning.", priority: "medium" },
        { question: "Kan overslaget laves om til en fast pris eller et bindende tilbud?", why: "Så ved du præcis, hvad det ender med at koste.", priority: "high" },
        { question: "Hvornår kan I starte, og hvor lang tid forventer I, at arbejdet tager?", why: "Der står ingen tidsplan i tilbuddet.", priority: "medium" },
        { question: "Hvilken timepris bruger I, hvis der opstår ekstraarbejde?", why: "Så kan du selv regne på eventuelle tillæg.", priority: "low" },
        { question: "Er I medlem af en garantiordning eller Byggeriets Ankenævn, og hvilken garanti giver I på vådrumsarbejdet?", why: "Et badeværelse er dyrt at lave om, hvis membranen svigter.", priority: "medium" },
      ],
      currency: "DKK",
      language: "dansk",
      rules: [
        { key: "autorisation", status: "missing", note: "Tilbuddet omfatter både VVS- og el-arbejde, men nævner ikke, at det udføres af autoriserede installatører. Spørg efter autorisationsnumrene." },
        { key: "abForbruger", status: "missing", note: "Der henvises ikke til AB-Forbruger eller andre standardvilkår, så det er uklart, hvad der gælder ved mangler og forsinkelse." },
        { key: "fradrag", status: "unclear", note: "Noget af arbejdslønnen står for sig, men \"Diverse arbejde\" og materialer er blandet sammen. Tjek på skat.dk, om opgaven giver fradrag." },
        { key: "miljoe", status: "unclear", note: "Det gamle badeværelse rives ned. Er huset opført eller renoveret før ca. 1986, bør der tjekkes for asbest og PCB først." },
        { key: "vaadrum", status: "missing", note: "Membran og vådrumssikring er ikke nævnt. Et nyt badeværelse skal udføres efter BUILD-anvisning 252." },
        { key: "ankenaevn", status: "missing", note: "Der står intet om Byggeriets Ankenævn eller en garantiordning." },
      ],
      priceLevel: { level: "normal", explanation: "Omkring 160.000 kr. for et nyt badeværelse ligger inden for et almindeligt dansk prisniveau – men det er et overslag, så prisen kan stige." },
      extraCostRisk: {
        min: 8000,
        max: 29000,
        explanation: "Risikoen kommer især fra el efter forbrug, uspecificerede materialer og manglende bortskaffelse. Beløbet er et skøn ekskl. moms.",
      },
    },
  },
  {
    slug: "nordvest",
    keywords: ["nordvest"],
    fileName: "nordvest-badevaerelser.pdf",
    projectName: "Nyt badeværelse",
    contractorAddress: "Håndværkervej 3, 2400 København NV",
    customer: "Familien Jensen, Søndergade 8, 4000 Roskilde",
    pdfTerms: [
      "Fast pris. Prisen reguleres ikke, medmindre kunden ønsker ændringer.",
      "Betaling: 25 % ved opstart, 50 % ved færdig membran, 25 % ved aflevering.",
      "Uforudsete forhold (fx råd i bjælkelag) aftales skriftligt før udførelse. Timepris 545 kr. ekskl. moms.",
      "Opstart uge 41. Forventet varighed 3 uger.",
      "Vådrum udføres efter SBi-anvisning 252. 5 års garanti på membran. Medlem af Byggeriets Ankenævn.",
      "Oprydning og bortskaffelse er inkluderet. Tilbuddet gælder i 30 dage.",
    ],
    raw: {
      contractor: { name: "Nordvest Badeværelser A/S", cvr: "41 87 22 09", phone: "38 10 20 30", email: "kontakt@nordvestbad.example", address: "Håndværkervej 3, 2400 København NV" },
      title: "Totalrenovering af badeværelse, 6 m²",
      quoteDate: "2026-09-05",
      validUntil: "2026-10-05",
      priceType: "fast_pris",
      totals: { exclVat: 129800, vat: 32450, inclVat: 162250 },
      summary:
        "Nordvest Badeværelser tilbyder at renovere badeværelset til en fast pris på 162.250 kr. inkl. moms. Tilbuddet er meget grundigt: hver post er beskrevet med mængder og materialer, og der er en klar betalingsplan i tre rater. Oprydning, bortskaffelse og garanti er med, og firmaet er medlem af Byggeriets Ankenævn. Det eneste, der er lidt uklart, er hvor meget af den eksisterende el-installation der skal tilpasses.",
      lineItems: [
        li("Nedrivning af eksisterende bad inkl. fliser og inventar", "Arbejdsløn", 12400, "clear", "Det gamle badeværelse fjernes helt, så der er klar til nyt."),
        li("Container 10 m³ og bortskaffelse af byggeaffald", "Bortskaffelse", 4600, "clear", "Leje af container og aflevering af affald på genbrugsplads."),
        li("VVS: nye afløb, vandrør og Unidrain gulvafløb", "Arbejdsløn", 26800, "clear", "Alle rør og afløb skiftes, og der monteres et lineært gulvafløb."),
        li("Vådrumssikring/membran efter SBi-anvisning 252", "Materialer", 6900, "clear", "Den vandtætte membran under fliserne – det vigtigste lag i et badeværelse."),
        li("Fliser, Marazzi 30×60, 28 m²", "Materialer", 13580, "clear", "Fliser til gulv (6 m²) og vægge (22 m²) inkl. 10 % spild.", { quantity: 28, unit: "m²", unitPrice: 485 }),
        li("Flisemontering inkl. fuger og silikone", "Arbejdsløn", 21840, "clear", "Opsætning af fliser og fugning.", { quantity: 28, unit: "m²", unitPrice: 780 }),
        li("Sanitet: Geberit væghængt toilet, Grohe brusesæt, møbel 80 cm", "Materialer", 18900, "clear", "De konkrete produkter er navngivet, så du kan tjekke prisen selv."),
        li("El-arbejde: 3 spots, stikkontakt, gulvvarme 6 m² og tilpasning", "Arbejdsløn", 15200, "vague", "Det nye lys og gulvvarmen er beskrevet, men ikke hvor meget af den gamle installation der skal tilpasses.", { note: "\"Tilpasning\" er ikke nærmere beskrevet" }),
        li("Kørsel og etablering af byggeplads", "Kørsel", 3500, "clear", "Transport og opstilling af værktøj."),
        li("Projektering og koordinering af fag", "Projektering", 4200, "clear", "Planlægning og styring af VVS, el og murer, så du kun har én kontakt."),
        li("Leje af affugter, 7 dage", "Leje af udstyr", 1880, "clear", "Affugter til at tørre membran og afretning hurtigere.", { quantity: 7, unit: "dage", unitPrice: 268.57 }),
      ],
      flags: [
        {
          severity: "medium",
          type: "vague_item",
          title: "\"Tilpasning\" af el er ikke beskrevet",
          explanation: "El-posten nævner tilpasning af eksisterende installation uden at sige hvor meget. Spørg om det er med i den faste pris, uanset hvad de finder.",
          relatedItem: "El-arbejde: 3 spots, stikkontakt, gulvvarme 6 m² og tilpasning",
          estimatedExtraMin: 0,
          estimatedExtraMax: 3000,
        },
        {
          severity: "low",
          type: "hidden_cost",
          title: "Uforudsete forhold afregnes til 545 kr./time",
          explanation: "Det er godt, at timeprisen står der. Findes der fx råd i gulvet, kan det give ekstraarbejde – men det skal aftales skriftligt først.",
          relatedItem: null,
          estimatedExtraMin: 0,
          estimatedExtraMax: 2000,
        },
        {
          severity: "low",
          type: "price",
          title: "Tilvalg af sanitet kan hæve prisen",
          explanation: "Prisen gælder de nævnte produkter. Vælger du andre, kan det koste mere.",
          relatedItem: "Sanitet: Geberit væghængt toilet, Grohe brusesæt, møbel 80 cm",
          estimatedExtraMin: 0,
          estimatedExtraMax: 1000,
        },
      ],
      checks: [
        { key: "cvr", present: true, note: "CVR 41 87 22 09." },
        { key: "validity", present: true, note: "Gælder i 30 dage." },
        { key: "timeline", present: true, note: "Opstart uge 41, ca. 3 uger." },
        { key: "payment", present: true, note: "3 rater: 25 / 50 / 25 %." },
        { key: "vat", present: true, note: "Tydeligt ekskl. og inkl. moms." },
        { key: "materials", present: true, note: "Mærker og mængder er angivet." },
        { key: "hourly", present: true, note: "545 kr./time ekskl. moms." },
        { key: "unforeseen", present: true, note: "Aftales skriftligt før udførelse." },
        { key: "cleanup", present: true, note: "Container og oprydning er med." },
        { key: "warranty", present: true, note: "5 års garanti på membran, medlem af Byggeriets Ankenævn." },
      ],
      questions: [
        { question: "Hvad dækker \"tilpasning\" i el-posten, og er det med i den faste pris uanset omfang?", why: "Det er den eneste post, der ikke er helt beskrevet.", priority: "high" },
        { question: "Kan I bekræfte, at opstart i uge 41 stadig holder?", why: "Så kan du planlægge, hvor I skal bade imens.", priority: "medium" },
        { question: "Hvad sker der, hvis I finder fugt eller råd i gulvet?", why: "Det er den mest almindelige årsag til ekstraregninger i badeværelser.", priority: "medium" },
        { question: "Hvilken farve og overflade har Marazzi-fliserne, og kan jeg se en prøve?", why: "Det er nemmere at ændre nu end efter bestilling.", priority: "low" },
        { question: "Får jeg dokumentation for membranen (fotos og produktblad) ved aflevering?", why: "Det er vigtigt ved et senere salg af boligen.", priority: "medium" },
      ],
      currency: "DKK",
      language: "dansk",
      rules: [
        { key: "autorisation", status: "unclear", note: "VVS og el er med i prisen. Spørg efter firmaets autorisationsnumre, så du kan tjekke dem hos Sikkerhedsstyrelsen." },
        { key: "abForbruger", status: "unclear", note: "Betalingsplan og vilkår er tydelige, men AB-Forbruger nævnes ikke direkte. Spørg om de bruger den." },
        { key: "fradrag", status: "ok", note: "Arbejdsløn og materialer står hver for sig. Tjek på skat.dk, om opgaven giver fradrag i år." },
        { key: "miljoe", status: "unclear", note: "Spørg om der er tjekket for asbest, hvis huset er fra før ca. 1986." },
        { key: "vaadrum", status: "ok", note: "Vådrumssikring efter SBi-/BUILD-anvisning 252 er nævnt, og der gives 5 års garanti på membranen." },
        { key: "ankenaevn", status: "ok", note: "Firmaet er medlem af Byggeriets Ankenævn." },
      ],
      priceLevel: { level: "normal", explanation: "Prisen ligger på et almindeligt dansk niveau for et totalrenoveret badeværelse på ca. 6 m² med de nævnte produkter." },
      extraCostRisk: {
        min: 0,
        max: 6000,
        explanation: "Fast pris og grundig beskrivelse giver lav risiko. Små tillæg kan opstå ved uforudsete forhold eller tilvalg.",
      },
    },
  },
  {
    slug: "kbh",
    keywords: ["kbh", "totalbyg"],
    fileName: "kbh-totalbyg.pdf",
    projectName: "Nyt badeværelse",
    contractorAddress: "København",
    customer: "Familien Jensen",
    pdfTerms: [
      "50 % af beløbet betales inden opstart.",
      "Arbejdet tager ca. 2 uger.",
      "Tilbuddet gælder 8 dage. Alle priser er ekskl. moms.",
    ],
    raw: {
      contractor: { name: "KBH Totalbyg", cvr: null, phone: "20 30 40 50", email: null, address: "København" },
      title: "Badeværelse – totalpakke",
      quoteDate: "2026-09-08",
      validUntil: "2026-09-16",
      priceType: "uklart",
      totals: { exclVat: 98000, vat: 24500, inclVat: 122500 },
      summary:
        "KBH Totalbyg er billigst med 122.500 kr. inkl. moms, men tilbuddet består kun af tre samleposter uden beskrivelse. Der er intet CVR-nummer, og halvdelen af beløbet skal betales, før arbejdet går i gang. Det er uklart, om prisen er fast, og der står intet om materialer, garanti eller hvad der sker ved ekstraarbejde. Den lave pris kan derfor ende højere, og du har få muligheder, hvis noget går galt.",
      lineItems: [
        li("Totalrenovering af badeværelse", "Arbejdsløn", 68000, "unclear", "Én samlet post for hele arbejdet. Der står ikke, hvad der er med – fx VVS, el, fliser eller membran.", { note: "Ingen specifikation" }),
        li("Materialer", "Materialer", 24000, "unclear", "Der står ikke, hvilke materialer eller produkter du får.", { note: "Ingen specifikation" }),
        li("Kørsel og bortskaffelse af affald", "Bortskaffelse", 6000, "clear", "Transport og aflevering af byggeaffald."),
      ],
      flags: [
        {
          severity: "high",
          type: "terms",
          title: "50 % skal betales før arbejdet starter",
          explanation: "61.250 kr. inkl. moms før der er udført noget arbejde er en stor risiko. Hvis firmaet går konkurs eller ikke dukker op, kan pengene være tabt. Almindelig praksis er betaling i rater efter udført arbejde.",
          relatedItem: null,
          estimatedExtraMin: null,
          estimatedExtraMax: null,
        },
        {
          severity: "high",
          type: "missing_info",
          title: "Intet CVR-nummer",
          explanation: "Uden CVR-nummer kan du ikke slå firmaet op og tjekke, om det eksisterer, har regnskaber eller er momsregistreret.",
          relatedItem: null,
          estimatedExtraMin: null,
          estimatedExtraMax: null,
        },
        {
          severity: "high",
          type: "vague_item",
          title: "68.000 kr. til \"totalrenovering\" uden indhold",
          explanation: "Du kan ikke se, hvad der er med i prisen. Alt, der ikke er nævnt, kan blive faktureret som ekstraarbejde.",
          relatedItem: "Totalrenovering af badeværelse",
          estimatedExtraMin: 5000,
          estimatedExtraMax: 25000,
        },
        {
          severity: "high",
          type: "vague_item",
          title: "Materialer for 24.000 kr. er ikke beskrevet",
          explanation: "Uden mærker og mængder kan du ikke vide, om du får billige eller gode produkter.",
          relatedItem: "Materialer",
          estimatedExtraMin: 3000,
          estimatedExtraMax: 15000,
        },
        {
          severity: "medium",
          type: "terms",
          title: "Tilbuddet gælder kun 8 dage",
          explanation: "Kort frist kan presse dig til at beslutte dig hurtigt. Tag den tid, du har brug for.",
          relatedItem: null,
          estimatedExtraMin: null,
          estimatedExtraMax: null,
        },
      ],
      checks: [
        { key: "cvr", present: false, note: "Intet CVR-nummer." },
        { key: "validity", present: true, note: "Gælder i 8 dage." },
        { key: "timeline", present: true, note: "Ca. 2 uger, men ingen startdato." },
        { key: "payment", present: true, note: "50 % før opstart." },
        { key: "vat", present: true, note: "Priser ekskl. moms." },
        { key: "materials", present: false, note: "Ikke specificeret." },
        { key: "hourly", present: false, note: "Ingen timepris." },
        { key: "unforeseen", present: false, note: "Ikke beskrevet." },
        { key: "cleanup", present: false, note: "Bortskaffelse er nævnt, men ikke oprydning." },
        { key: "warranty", present: false, note: "Ingen garanti eller forsikring nævnt." },
      ],
      questions: [
        { question: "Hvad er jeres CVR-nummer?", why: "Så kan du slå firmaet op på virk.dk.", priority: "high" },
        { question: "Kan forudbetalingen nedsættes, så der betales i rater efter udført arbejde?", why: "50 % forud er en stor risiko for dig.", priority: "high" },
        { question: "Kan I specificere \"Totalrenovering\" til 68.000 kr. – hvad er med af VVS, el, membran og fliser?", why: "Ellers kan alt uden for beskrivelsen blive ekstraarbejde.", priority: "high" },
        { question: "Hvilke materialer og produkter indgår i de 24.000 kr.?", why: "Så kan du sammenligne med de andre tilbud.", priority: "high" },
        { question: "Er prisen fast, eller er det et overslag?", why: "Det afgør, om prisen kan stige.", priority: "medium" },
        { question: "Udføres vådrumssikringen efter SBi-anvisning 252, og hvilken garanti giver I?", why: "Membranen er det vigtigste i et badeværelse.", priority: "medium" },
        { question: "Hvilken forsikring har I, hvis der sker skade under arbejdet?", why: "Du skal vide, hvem der betaler, hvis noget går galt.", priority: "medium" },
      ],
      currency: "DKK",
      language: "dansk",
      rules: [
        { key: "autorisation", status: "missing", note: "Et nyt badeværelse kræver normalt autoriseret VVS- og el-arbejde, men der står intet om autorisation – og firmaet har intet CVR-nummer i tilbuddet." },
        { key: "abForbruger", status: "missing", note: "Ingen standardvilkår. 50 % forudbetaling er langt fra almindelig praksis efter AB-Forbruger, hvor man betaler efter udført arbejde." },
        { key: "fradrag", status: "missing", note: "Arbejdsløn og materialer er slået sammen i én post, så du kan ikke se, hvad der evt. kan give fradrag." },
        { key: "vaadrum", status: "missing", note: "Membran og vådrumssikring er ikke nævnt." },
        { key: "ankenaevn", status: "missing", note: "Ingen garanti, forsikring eller ankenævn." },
      ],
      priceLevel: { level: "lav", explanation: "Prisen er lav for et totalrenoveret badeværelse i Danmark. Det kan betyde, at noget ikke er med i prisen." },
      extraCostRisk: {
        min: 8000,
        max: 40000,
        explanation: "Den høje risiko skyldes, at næsten hele beløbet ligger i to uspecificerede samleposter.",
      },
    },
  },
  {
    slug: "lysluft",
    keywords: ["lys", "luft", "vindue"],
    fileName: "lys-og-luft-vinduer.pdf",
    projectName: "Nye vinduer",
    contractorAddress: "Vestergade 51, 8000 Aarhus C",
    customer: "Familien Jensen, Søndergade 8, 4000 Roskilde",
    pdfTerms: [
      "Pris for vinduer og montering er bindende.",
      "Murværksreparation afregnes efter regning.",
      "Betaling: 30 % ved bestilling, rest ved aflevering.",
      "Levering ca. 6 uger efter bestilling, montering 2 dage.",
      "10 års producentgaranti på vinduer. 5 års garanti på montering. Tilbuddet gælder 30 dage.",
    ],
    raw: {
      contractor: { name: "Lys & Luft Vinduer ApS", cvr: "37 55 10 92", phone: "86 40 50 60", email: "salg@lysogluft.example", address: "Vestergade 51, 8000 Aarhus C" },
      title: "Udskiftning af 8 vinduer",
      quoteDate: "2026-08-28",
      validUntil: "2026-09-27",
      priceType: "tilbud",
      totals: { exclVat: 123200, vat: 30800, inclVat: 154000 },
      summary:
        "Lys & Luft tilbyder at udskifte 8 vinduer for 154.000 kr. inkl. moms. Vinduer, montering og bortskaffelse er tydeligt beskrevet med stykpriser, og der er god garanti. Den svage plet er murværksreparationen, som afregnes efter regning, og der står ingen timepris. Maling af lysninger er heller ikke nævnt.",
      lineItems: [
        li("Velfac 200 Energy, 3-lags, træ/alu, hvid", "Materialer", 78800, "clear", "Selve vinduerne. Mærke, type og antal er angivet.", { quantity: 8, unit: "stk.", unitPrice: 9850 }),
        li("Montering af vinduer", "Arbejdsløn", 19200, "clear", "Isætning, justering og fastgørelse.", { quantity: 8, unit: "stk.", unitPrice: 2400 }),
        li("Demontering og bortskaffelse af gamle vinduer", "Bortskaffelse", 5200, "clear", "De gamle vinduer tages ud og køres væk.", { quantity: 8, unit: "stk.", unitPrice: 650 }),
        li("Indvendig lysning og fugning", "Arbejdsløn", 8800, "clear", "Afslutning omkring vinduet indvendigt og tætning med fuge.", { quantity: 8, unit: "stk.", unitPrice: 1100 }),
        li("Murværksreparation efter regning (anslået)", "Arbejdsløn", 6000, "unclear", "Reparation af mur omkring vinduerne. Beløbet er kun et skøn, og du betaler den faktiske regning.", { note: "Efter regning" }),
        li("Kørsel", "Kørsel", 1800, "clear", "Transport til og fra adressen."),
        li("Leje af lift", "Leje af udstyr", 3400, "clear", "Lift til vinduerne på 1. sal."),
      ],
      flags: [
        {
          severity: "high",
          type: "hidden_cost",
          title: "Murværk afregnes \"efter regning\"",
          explanation: "De 6.000 kr. er kun et skøn. Ved gamle huse kan murværket omkring vinduerne være i dårligere stand end forventet, og der er intet loft.",
          relatedItem: "Murværksreparation efter regning (anslået)",
          estimatedExtraMin: 3000,
          estimatedExtraMax: 12000,
        },
        {
          severity: "medium",
          type: "hidden_cost",
          title: "Råd i karme eller bundstykker er ikke nævnt",
          explanation: "Ved udskiftning af gamle vinduer finder man ofte råd i trædele omkring vinduet. Spørg, hvad det koster, hvis det sker.",
          relatedItem: null,
          estimatedExtraMin: 0,
          estimatedExtraMax: 4000,
        },
        {
          severity: "low",
          type: "missing_info",
          title: "Ingen timepris for ekstraarbejde",
          explanation: "Når noget afregnes efter regning, bør timeprisen stå i tilbuddet.",
          relatedItem: null,
          estimatedExtraMin: null,
          estimatedExtraMax: null,
        },
        {
          severity: "low",
          type: "price",
          title: "Maling af lysninger er ikke med",
          explanation: "Lysningerne fuges, men der står ikke noget om maling. Regn med selv at gøre det eller betale ekstra.",
          relatedItem: "Indvendig lysning og fugning",
          estimatedExtraMin: 0,
          estimatedExtraMax: 2000,
        },
      ],
      checks: [
        { key: "cvr", present: true, note: "CVR 37 55 10 92." },
        { key: "validity", present: true, note: "Gælder i 30 dage." },
        { key: "timeline", present: true, note: "Levering ca. 6 uger, montering 2 dage." },
        { key: "payment", present: true, note: "30 % ved bestilling, rest ved aflevering." },
        { key: "vat", present: true, note: "Priser ekskl. moms med moms i bunden." },
        { key: "materials", present: true, note: "Velfac 200 Energy, 3-lags." },
        { key: "hourly", present: false, note: "Ingen timepris." },
        { key: "unforeseen", present: false, note: "Kun murværk efter regning – intet om andre forhold." },
        { key: "cleanup", present: true, note: "Bortskaffelse af gamle vinduer er med." },
        { key: "warranty", present: true, note: "10 års producentgaranti, 5 år på montering." },
      ],
      questions: [
        { question: "Kan I give en fast pris eller et loft på murværksreparationen i stedet for efter regning?", why: "Så ved du, hvad det højst kan koste.", priority: "high" },
        { question: "Hvad er jeres timepris for ekstraarbejde?", why: "Den mangler i tilbuddet.", priority: "medium" },
        { question: "Hvad sker der, hvis der er råd i karme eller bundstykker?", why: "Det er en almindelig overraskelse ved gamle vinduer.", priority: "medium" },
        { question: "Er maling af de indvendige lysninger med i prisen?", why: "Det står ikke i tilbuddet.", priority: "low" },
        { question: "Kan de 30 % ved bestilling nedsættes, eller stilles der sikkerhed for dem?", why: "Du betaler 46.200 kr. inkl. moms ca. 6 uger før levering.", priority: "medium" },
        { question: "Hvilken U-værdi har vinduerne, og opfylder de kravene til evt. tilskud?", why: "Så kan du tjekke, om du får det, du betaler for.", priority: "low" },
      ],
      currency: "DKK",
      language: "dansk",
      rules: [
        { key: "fradrag", status: "ok", note: "Montering er opgjort for sig. Tjek på skat.dk, om udskiftning af vinduer giver fradrag i år." },
        { key: "tilladelse", status: "unclear", note: "Nye vinduer kræver normalt ikke byggetilladelse, men ændres facadens udseende, eller er huset bevaringsværdigt, så spørg kommunen først." },
        { key: "miljoe", status: "unclear", note: "Ved udskiftning i ældre huse kan fuger og kit indeholde PCB eller asbest. Spørg om det er undersøgt." },
        { key: "ankenaevn", status: "unclear", note: "Der er god garanti, men Byggeriets Ankenævn eller en garantiordning er ikke nævnt." },
      ],
      priceLevel: { level: "normal", explanation: "Prisen pr. vindue inkl. montering ligger på et almindeligt dansk niveau for 3-lags træ/alu-vinduer." },
      extraCostRisk: {
        min: 3000,
        max: 18000,
        explanation: "Risikoen ligger især i murværk efter regning og evt. råd i træværket.",
      },
    },
  },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick a demo analysis by filename keyword, otherwise deterministically by hash. */
export function pickDemoQuote(fileName: string): DemoQuote {
  const lower = fileName.toLowerCase();
  const byKeyword = DEMO_QUOTES.find((q) => q.keywords.some((k) => lower.includes(k)));
  return byKeyword ?? DEMO_QUOTES[hash(lower) % DEMO_QUOTES.length];
}
