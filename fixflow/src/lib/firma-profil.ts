/**
 * "Klar til AI": a customer's facts in a form that search engines and AI assistants (ChatGPT, Gemini,
 * Perplexity, Siri, Copilot …) can read without guessing: schema.org JSON-LD on the page and an llms.txt.
 * Only facts the firm has approved belong here. Nothing in this file may promise that an AI will recommend the firm.
 */

export type Dag = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

export type Ydelse = { navn: string; minutter?: number; /** DKK incl. VAT. "fra"-price when fraPris is true. */ pris?: number; fraPris?: boolean };

export type Aabning = { dage: readonly Dag[]; fra: string; til: string };

export type FirmaProfil = {
  navn: string;
  /** Short, plain description in the firm's own words (1-3 sentences). */
  beskrivelse: string;
  /** schema.org type, e.g. HairSalon, AutoRepair, HomeAndConstructionBusiness. */
  type: SchemaType;
  branche: string;
  adresse: { gade: string; postnr: string; by: string };
  telefon?: string;
  email?: string;
  hjemmeside?: string;
  /** Towns/areas the firm works in. */
  omraade?: readonly string[];
  ydelser: readonly Ydelse[];
  /** Empty when the firm works "efter aftale". */
  aabning: readonly Aabning[];
  efterAftale?: boolean;
  bookingUrl?: string;
  /** Facebook, Instagram, Google Maps … */
  links?: readonly string[];
  cvr?: string;
  /** Example profile: shown with a banner, never indexed, never in the sitemap. */
  eksempel?: boolean;
};

export const SCHEMA_TYPES = [
  "LocalBusiness", "HairSalon", "BeautySalon", "NailSalon", "DaySpa", "HealthAndBeautyBusiness", "AutoRepair",
  "HomeAndConstructionBusiness", "GeneralContractor", "Plumber", "Electrician", "HousePainter", "RoofingContractor",
  "Physiotherapy", "MedicalClinic", "DrivingSchool", "Restaurant", "CafeOrCoffeeShop", "Store", "PetStore",
] as const;
export type SchemaType = (typeof SCHEMA_TYPES)[number];

const DAG_NAVN: Record<Dag, string> = { Mo: "mandag", Tu: "tirsdag", We: "onsdag", Th: "torsdag", Fr: "fredag", Sa: "lørdag", Su: "søndag" };
const DAG_SCHEMA: Record<Dag, string> = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr.`;

export function ydelseTekst(y: Ydelse): string {
  const dele = [y.navn];
  if (y.minutter) dele.push(`${y.minutter} min`);
  if (y.pris !== undefined) dele.push(`${y.fraPris ? "fra " : ""}${kr(y.pris)}`);
  return dele.join(", ");
}

export function aabningTekst(a: Aabning): string {
  const navne = a.dage.map((d) => DAG_NAVN[d]);
  const dage = navne.length > 2 ? `${navne[0]} til ${navne[navne.length - 1]}` : navne.join(" og ");
  return `${dage[0].toUpperCase()}${dage.slice(1)} ${a.fra}-${a.til}`;
}

/** schema.org LocalBusiness (or subtype) with services, prices, opening hours and booking action. */
export function firmaJsonLd(p: FirmaProfil, sideUrl: string) {
  const id = `${sideUrl}#firma`;
  return {
    "@context": "https://schema.org",
    "@type": p.type,
    "@id": id,
    name: p.navn,
    description: p.beskrivelse,
    url: p.hjemmeside ?? sideUrl,
    ...(p.telefon ? { telephone: p.telefon } : {}),
    ...(p.email ? { email: p.email } : {}),
    ...(p.cvr ? { vatID: `DK${p.cvr}` } : {}),
    address: { "@type": "PostalAddress", streetAddress: p.adresse.gade, postalCode: p.adresse.postnr, addressLocality: p.adresse.by, addressCountry: "DK" },
    ...(p.omraade?.length ? { areaServed: p.omraade.map((name) => ({ "@type": "City", name })) } : {}),
    ...(p.aabning.length
      ? { openingHoursSpecification: p.aabning.map((a) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: a.dage.map((d) => DAG_SCHEMA[d]), opens: a.fra, closes: a.til })) }
      : {}),
    ...(p.links?.length ? { sameAs: p.links } : {}),
    currenciesAccepted: "DKK",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Ydelser",
      itemListElement: p.ydelser.map((y) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: y.navn, ...(y.minutter ? { duration: `PT${y.minutter}M` } : {}) },
        ...(y.pris !== undefined
          ? { priceSpecification: { "@type": "PriceSpecification", price: y.pris, priceCurrency: "DKK", valueAddedTaxIncluded: true, ...(y.fraPris ? { minPrice: y.pris } : {}) } }
          : {}),
      })),
    },
    ...(p.bookingUrl
      ? { potentialAction: { "@type": "ReserveAction", target: { "@type": "EntryPoint", urlTemplate: p.bookingUrl, actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"] } } }
      : {}),
  };
}

/** Plain markdown for AI assistants (llms.txt convention). Facts only. */
export function firmaLlmsTxt(p: FirmaProfil, sideUrl: string): string {
  const l: string[] = [`# ${p.navn}`, "", `> ${p.beskrivelse}`, ""];
  l.push("## Fakta");
  l.push(`- Branche: ${p.branche}`);
  l.push(`- Adresse: ${p.adresse.gade}, ${p.adresse.postnr} ${p.adresse.by}`);
  if (p.omraade?.length) l.push(`- Arbejder i: ${p.omraade.join(", ")}`);
  if (p.telefon) l.push(`- Telefon: ${p.telefon}`);
  if (p.email) l.push(`- E-mail: ${p.email}`);
  if (p.cvr) l.push(`- CVR: ${p.cvr}`);
  l.push("", "## Ydelser og priser");
  for (const y of p.ydelser) l.push(`- ${ydelseTekst(y)}`);
  if (p.ydelser.some((y) => y.pris !== undefined)) l.push("", "Priser er inkl. moms.");
  l.push("", "## Åbningstider");
  if (p.aabning.length) for (const a of p.aabning) l.push(`- ${aabningTekst(a)}`);
  if (p.efterAftale || !p.aabning.length) l.push("- Efter aftale");
  l.push("", "## Sådan bestiller man");
  if (p.bookingUrl) l.push(`- Book online: ${p.bookingUrl}`);
  if (p.telefon) l.push(`- Ring på ${p.telefon}`);
  if (p.email) l.push(`- Skriv til ${p.email}`);
  l.push("", "## Links", `- [Firmaets side](${p.hjemmeside ?? sideUrl})`);
  for (const link of p.links ?? []) l.push(`- ${link}`);
  return `${l.join("\n")}\n`;
}

/** Problems that would make the profile untrue or useless for an AI. Empty list = OK. */
export function profilFejl(p: FirmaProfil): string[] {
  const fejl: string[] = [];
  if (!p.navn.trim()) fejl.push("navn mangler");
  if (p.beskrivelse.length < 20) fejl.push("beskrivelse er for kort");
  if (!/^\d{4}$/.test(p.adresse.postnr)) fejl.push("postnummer skal være 4 cifre");
  if (!p.ydelser.length) fejl.push("ingen ydelser");
  if (!p.telefon && !p.email && !p.bookingUrl) fejl.push("ingen måde at kontakte firmaet på");
  if (!p.aabning.length && !p.efterAftale) fejl.push("åbningstider mangler (eller sæt efterAftale)");
  for (const a of p.aabning) if (!/^\d{2}:\d{2}$/.test(a.fra) || !/^\d{2}:\d{2}$/.test(a.til) || a.fra >= a.til) fejl.push(`ugyldig åbningstid ${a.fra}-${a.til}`);
  for (const u of [p.bookingUrl, p.hjemmeside, ...(p.links ?? [])]) if (u && !/^https:\/\//.test(u)) fejl.push(`link skal starte med https://: ${u}`);
  const tekst = JSON.stringify(p).toLowerCase();
  for (const ord of ["anbefalet af chatgpt", "nr. 1 på google", "garanti for", "bedste i byen"]) if (tekst.includes(ord)) fejl.push(`løfte vi ikke kan holde: "${ord}"`);
  return fejl;
}
