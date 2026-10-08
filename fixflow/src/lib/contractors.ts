import "server-only";
import { distanceKm, isPostalCode, locatePostalCode, type Place } from "./geo";

/**
 * Finding contractors near the user.
 *
 * Real data comes from the official Danish business register (CVR) via Erhvervsstyrelsen's
 * "system-til-system" Elasticsearch access (free, requires an application – see README).
 * Set CVR_ES_USER and CVR_ES_PASSWORD to enable it. Without credentials the app shows
 * clearly marked FICTIONAL demo firms, so the feature can be tried end-to-end.
 *
 * We deliberately do NOT claim which firm is "best": a register can't tell quality. Firms are
 * sorted by distance; the user then asks for quotes and Budsyn compares the quotes themselves.
 */

export const TRADES = {
  vvs: { label: "VVS og badeværelse", codes: ["432200"] },
  el: { label: "Elektriker", codes: ["432100"] },
  toemrer: { label: "Tømrer og snedker", codes: ["433200"] },
  vinduer: { label: "Vinduer og døre", codes: ["433200", "432900"] },
  murer: { label: "Murer", codes: ["439910", "439900"] },
  maler: { label: "Maler", codes: ["433410"] },
  gulv: { label: "Gulv og fliser", codes: ["433300"] },
  tag: { label: "Tag", codes: ["439100"] },
  byg: { label: "Byggefirma / totalentreprise", codes: ["412000"] },
} as const;
export type TradeKey = keyof typeof TRADES;

export type ContractorResult = {
  id: string;
  name: string;
  cvr: string | null;
  address: string;
  postalCode: string;
  city: string;
  distanceKm: number;
  approxDistance: boolean;
  phone: string | null;
  email: string | null;
  foundedYear: number | null;
  companyForm: string | null;
  source: "cvr" | "demo";
};

export const isCvrEnabled = () => !!(process.env.CVR_ES_USER && process.env.CVR_ES_PASSWORD);

export async function findContractors(trade: TradeKey, postalCode: string, radiusKm: number) {
  const origin = await locatePostalCode(postalCode);
  if (!origin) return { origin: null, results: [] as ContractorResult[], source: "demo" as const };
  const results = isCvrEnabled() ? await fromCvr(trade, origin, radiusKm) : demoFirms(trade, origin, radiusKm);
  return { origin, results, source: isCvrEnabled() ? ("cvr" as const) : ("demo" as const) };
}

/* ------------------------------- CVR -------------------------------- */

type CvrHit = {
  _source?: {
    Vrvirksomhed?: {
      cvrNummer?: number;
      virksomhedMetadata?: {
        nyesteNavn?: { navn?: string };
        nyesteBeliggenhedsadresse?: {
          vejnavn?: string;
          husnummerFra?: number;
          bogstavFra?: string;
          postnummer?: number;
          postdistrikt?: string;
        };
        nyesteKontaktoplysninger?: string[];
        nyesteVirksomhedsform?: { kortBeskrivelse?: string };
        stiftelsesDato?: string;
      };
    };
  };
};

async function fromCvr(trade: TradeKey, origin: Place, radiusKm: number): Promise<ContractorResult[]> {
  const url = process.env.CVR_ES_URL || "https://distribution.virk.dk/cvr-permanent/virksomhed/_search";
  const pc = Number(origin.postalCode);
  // Postal codes are roughly regional. Fetch a generous band, then filter on real distance.
  const band = radiusKm <= 15 ? 300 : radiusKm <= 30 ? 700 : 1500;
  const body = {
    size: 300,
    _source: [
      "Vrvirksomhed.cvrNummer",
      "Vrvirksomhed.virksomhedMetadata.nyesteNavn",
      "Vrvirksomhed.virksomhedMetadata.nyesteBeliggenhedsadresse",
      "Vrvirksomhed.virksomhedMetadata.nyesteKontaktoplysninger",
      "Vrvirksomhed.virksomhedMetadata.nyesteVirksomhedsform",
      "Vrvirksomhed.virksomhedMetadata.stiftelsesDato",
    ],
    query: {
      bool: {
        filter: [
          { terms: { "Vrvirksomhed.virksomhedMetadata.nyesteHovedbranche.branchekode": TRADES[trade].codes } },
          { terms: { "Vrvirksomhed.virksomhedMetadata.sammensatStatus": ["Aktiv", "NORMAL"] } },
          {
            range: {
              "Vrvirksomhed.virksomhedMetadata.nyesteBeliggenhedsadresse.postnummer": {
                gte: Math.max(1000, pc - band),
                lte: Math.min(9990, pc + band),
              },
            },
          },
        ],
        // Respect reklamebeskyttelse: firms that opted out of marketing are never listed.
        must_not: [{ term: { "Vrvirksomhed.reklamebeskyttet": true } }],
      },
    },
  };
  const auth = Buffer.from(`${process.env.CVR_ES_USER}:${process.env.CVR_ES_PASSWORD}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`CVR search failed: ${res.status}`);
  const json = (await res.json()) as { hits?: { hits?: CvrHit[] } };

  const out: ContractorResult[] = [];
  for (const hit of json.hits?.hits ?? []) {
    const v = hit._source?.Vrvirksomhed;
    const m = v?.virksomhedMetadata;
    const a = m?.nyesteBeliggenhedsadresse;
    const code = a?.postnummer ? String(a.postnummer) : null;
    if (!v?.cvrNummer || !m?.nyesteNavn?.navn || !isPostalCode(code)) continue;
    const place = await locatePostalCode(code);
    if (!place) continue;
    const d = distanceKm(origin, place);
    if (d > radiusKm) continue;
    const contacts = m.nyesteKontaktoplysninger ?? [];
    out.push({
      id: String(v.cvrNummer),
      name: m.nyesteNavn.navn,
      cvr: String(v.cvrNummer),
      address: [a?.vejnavn, a?.husnummerFra, a?.bogstavFra].filter(Boolean).join(" "),
      postalCode: code,
      city: a?.postdistrikt ?? place.name,
      distanceKm: Math.round(d * 10) / 10,
      approxDistance: origin.approx || place.approx || !process.env.GEO_API_URL,
      phone: contacts.find((c) => /^\+?\d[\d\s]{6,}$/.test(c)) ?? null,
      email: contacts.find((c) => c.includes("@")) ?? null,
      foundedYear: m.stiftelsesDato ? Number(m.stiftelsesDato.slice(0, 4)) || null : null,
      companyForm: m.nyesteVirksomhedsform?.kortBeskrivelse ?? null,
      source: "cvr",
    });
  }
  return out.sort((x, y) => x.distanceKm - y.distanceKm).slice(0, 40);
}

/* ------------------------------- Demo -------------------------------- */

const DEMO_NAMES: Record<TradeKey, string[]> = {
  vvs: ["Demo VVS & Bad", "Eksempel Blik & Rør", "Prøve VVS-Service", "Test Badeværelser", "Fiktiv Rørteknik"],
  el: ["Demo El-teknik", "Eksempel Elektro", "Prøve El & Lys", "Test Installation", "Fiktiv Elservice"],
  toemrer: ["Demo Tømrer", "Eksempel Snedkeri", "Prøve Byg & Træ", "Test Tømrerfirma", "Fiktiv Træservice"],
  vinduer: ["Demo Vinduer", "Eksempel Vindue & Dør", "Prøve Glas & Karm", "Test Vinduesmontage", "Fiktiv Udsigt"],
  murer: ["Demo Murer", "Eksempel Murerfirma", "Prøve Mur & Puds", "Test Murerservice", "Fiktiv Facade"],
  maler: ["Demo Maler", "Eksempel Malerfirma", "Prøve Farve & Pensel", "Test Malerservice", "Fiktiv Overflade"],
  gulv: ["Demo Gulv", "Eksempel Fliser", "Prøve Gulvservice", "Test Klinker", "Fiktiv Gulv & Væg"],
  tag: ["Demo Tag", "Eksempel Tagdækning", "Prøve Tag & Rygning", "Test Tagservice", "Fiktiv Tagteknik"],
  byg: ["Demo Byg", "Eksempel Totalentreprise", "Prøve Byggeri", "Test Byg & Renovering", "Fiktiv Hus & Hjem"],
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Clearly fictional firms placed around the user's postal code, so the flow can be tried without CVR access. */
function demoFirms(trade: TradeKey, origin: Place, radiusKm: number): ContractorResult[] {
  const rnd = seeded(Number(origin.postalCode) * 31 + trade.length * 7);
  const names = DEMO_NAMES[trade];
  const out: ContractorResult[] = names.map((n, i) => {
    const d = Math.round((1.5 + rnd() * Math.max(6, radiusKm * 1.1)) * 10) / 10;
    return {
      id: `demo-${trade}-${i}`,
      name: `${n} ApS (fiktivt)`,
      cvr: null,
      address: "Fiktiv adresse",
      postalCode: origin.postalCode,
      city: origin.name,
      distanceKm: d,
      approxDistance: true,
      phone: null,
      email: null,
      foundedYear: 1995 + Math.floor(rnd() * 28),
      companyForm: "ApS",
      source: "demo",
    };
  });
  return out.filter((f) => f.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
}
