import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { geoCache } from "@/db/schema";

export type Place = { postalCode: string; name: string; lat: number; lng: number; approx: boolean };

/**
 * Approximate town-centre coordinates for common Danish postal codes.
 * Used when no address API is configured (GEO_API_URL), and as a fallback when it fails.
 * Distances based on these are rough ("ca.") – good enough to sort contractors by nearness.
 */
const KNOWN: Record<string, [string, number, number]> = {
  "1050": ["København K", 55.6786, 12.57], "1500": ["København V", 55.67, 12.555], "1800": ["Frederiksberg C", 55.678, 12.535],
  "2000": ["Frederiksberg", 55.681, 12.528], "2100": ["København Ø", 55.716, 12.577], "2150": ["Nordhavn", 55.71, 12.59],
  "2200": ["København N", 55.697, 12.548], "2300": ["København S", 55.655, 12.6], "2400": ["København NV", 55.707, 12.527],
  "2450": ["København SV", 55.652, 12.535], "2500": ["Valby", 55.662, 12.506], "2600": ["Glostrup", 55.666, 12.402],
  "2605": ["Brøndby", 55.65, 12.42], "2610": ["Rødovre", 55.681, 12.453], "2620": ["Albertslund", 55.657, 12.357],
  "2630": ["Taastrup", 55.651, 12.302], "2650": ["Hvidovre", 55.64, 12.475], "2660": ["Brøndby Strand", 55.62, 12.42],
  "2670": ["Greve", 55.583, 12.3], "2700": ["Brønshøj", 55.705, 12.495], "2720": ["Vanløse", 55.687, 12.49],
  "2730": ["Herlev", 55.724, 12.44], "2740": ["Skovlunde", 55.716, 12.4], "2750": ["Ballerup", 55.731, 12.363],
  "2760": ["Måløv", 55.749, 12.32], "2770": ["Kastrup", 55.635, 12.645], "2800": ["Kongens Lyngby", 55.771, 12.504],
  "2820": ["Gentofte", 55.75, 12.55], "2830": ["Virum", 55.795, 12.47], "2860": ["Søborg", 55.733, 12.51],
  "2880": ["Bagsværd", 55.761, 12.455], "2900": ["Hellerup", 55.731, 12.57], "2920": ["Charlottenlund", 55.752, 12.58],
  "2930": ["Klampenborg", 55.776, 12.59], "2950": ["Vedbæk", 55.853, 12.567], "2970": ["Hørsholm", 55.88, 12.5],
  "3000": ["Helsingør", 56.036, 12.613], "3050": ["Humlebæk", 55.962, 12.534], "3060": ["Espergærde", 55.995, 12.555],
  "3400": ["Hillerød", 55.927, 12.3], "3460": ["Birkerød", 55.847, 12.428], "3500": ["Værløse", 55.782, 12.369],
  "3520": ["Farum", 55.809, 12.36], "3600": ["Frederikssund", 55.84, 12.069], "3700": ["Rønne", 55.1, 14.706],
  "4000": ["Roskilde", 55.641, 12.08], "4100": ["Ringsted", 55.443, 11.79], "4200": ["Slagelse", 55.403, 11.354],
  "4300": ["Holbæk", 55.717, 11.713], "4400": ["Kalundborg", 55.68, 11.089], "4600": ["Køge", 55.457, 12.182],
  "4700": ["Næstved", 55.23, 11.76], "4760": ["Vordingborg", 55.008, 11.911], "4800": ["Nykøbing F", 54.766, 11.875],
  "4900": ["Nakskov", 54.831, 11.135], "5000": ["Odense C", 55.396, 10.388], "5200": ["Odense V", 55.39, 10.33],
  "5210": ["Odense NV", 55.41, 10.35], "5220": ["Odense SØ", 55.38, 10.44], "5230": ["Odense M", 55.375, 10.41],
  "5250": ["Odense SV", 55.36, 10.35], "5260": ["Odense S", 55.36, 10.4], "5500": ["Middelfart", 55.506, 9.731],
  "5700": ["Svendborg", 55.06, 10.607], "5800": ["Nyborg", 55.312, 10.79], "6000": ["Kolding", 55.491, 9.472],
  "6100": ["Haderslev", 55.25, 9.488], "6200": ["Aabenraa", 55.044, 9.418], "6400": ["Sønderborg", 54.909, 9.792],
  "6700": ["Esbjerg", 55.47, 8.452], "6800": ["Varde", 55.621, 8.481], "6900": ["Skjern", 55.95, 8.497],
  "7000": ["Fredericia", 55.565, 9.753], "7100": ["Vejle", 55.709, 9.536], "7400": ["Herning", 56.139, 8.973],
  "7500": ["Holstebro", 56.36, 8.616], "7700": ["Thisted", 56.955, 8.694], "7800": ["Skive", 56.567, 9.027],
  "8000": ["Aarhus C", 56.157, 10.21], "8200": ["Aarhus N", 56.18, 10.19], "8210": ["Aarhus V", 56.165, 10.15],
  "8220": ["Brabrand", 56.155, 10.11], "8230": ["Åbyhøj", 56.155, 10.16], "8240": ["Risskov", 56.19, 10.23],
  "8260": ["Viby J", 56.125, 10.16], "8270": ["Højbjerg", 56.12, 10.21], "8300": ["Odder", 55.973, 10.153],
  "8500": ["Grenaa", 56.416, 10.878], "8600": ["Silkeborg", 56.17, 9.545], "8700": ["Horsens", 55.861, 9.85],
  "8800": ["Viborg", 56.453, 9.402], "8900": ["Randers C", 56.461, 10.036], "9000": ["Aalborg", 57.048, 9.919],
  "9200": ["Aalborg SV", 57.03, 9.88], "9400": ["Nørresundby", 57.06, 9.92], "9500": ["Hobro", 56.64, 9.79],
  "9600": ["Aars", 56.803, 9.519], "9700": ["Brønderslev", 57.27, 9.94], "9800": ["Hjørring", 57.464, 9.982],
  "9900": ["Frederikshavn", 57.441, 10.537],
};
const KNOWN_CODES = Object.keys(KNOWN).map(Number).sort((a, b) => a - b);

export function isPostalCode(s: string | null | undefined): s is string {
  const n = Number(s);
  return !!s && /^\d{4}$/.test(s) && n >= 1000 && n <= 9990;
}

function builtin(code: string): Place | null {
  if (!isPostalCode(code)) return null;
  const exact = KNOWN[code];
  if (exact) return { postalCode: code, name: exact[0], lat: exact[1], lng: exact[2], approx: false };
  const n = Number(code);
  // Copenhagen's many street-level codes map to the nearest central district.
  const nearest = KNOWN_CODES.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), KNOWN_CODES[0]);
  const k = KNOWN[String(nearest)];
  return { postalCode: code, name: `Postnr. ${code}`, lat: k[1], lng: k[2], approx: true };
}

/** DAWA-compatible API (Danmarks Adresser). Set GEO_API_URL, e.g. https://api.dataforsyningen.dk – check that it is still offered. */
async function fromApi(code: string): Promise<Place | null> {
  const base = process.env.GEO_API_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/postnumre/${code}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { navn?: string; visueltcenter?: [number, number] };
    if (!j.visueltcenter) return null;
    return { postalCode: code, name: j.navn || `Postnr. ${code}`, lng: j.visueltcenter[0], lat: j.visueltcenter[1], approx: false };
  } catch {
    return null;
  }
}

export async function locatePostalCode(code: string | null | undefined): Promise<Place | null> {
  if (!isPostalCode(code)) return null;
  const cached = await db.query.geoCache.findFirst({ where: eq(geoCache.postalCode, code) });
  if (cached && !cached.approx) return { postalCode: code, name: cached.name ?? code, lat: cached.lat, lng: cached.lng, approx: false };

  const place = (await fromApi(code)) ?? builtin(code);
  if (place && !place.approx) {
    await db
      .insert(geoCache)
      .values({ postalCode: code, name: place.name, lat: place.lat, lng: place.lng, approx: false })
      .onConflictDoUpdate({ target: geoCache.postalCode, set: { name: place.name, lat: place.lat, lng: place.lng, approx: false, updatedAt: new Date() } });
  }
  return place;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Finds a 4-digit Danish postal code in a free-text address ("Industrivej 14, 4000 Roskilde"). */
export function postalCodeFromText(text: string | null | undefined): string | null {
  const m = text?.match(/\b([1-9]\d{3})\s+[A-ZÆØÅa-zæøå]/);
  return m && isPostalCode(m[1]) ? m[1] : null;
}
