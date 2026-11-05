import type { FirmaProfil } from "@/lib/firma-profil";

/**
 * Customers' public "Klar til AI" profiles at klardal.com/firma/<slug> (+ /llms.txt).
 * Only add a firm after it has said yes and approved every fact (phone, prices, hours) in writing.
 * Profiles marked eksempel are demos: banner, noindex, not in the sitemap.
 */
export const KUNDER: Record<string, FirmaProfil> = {
  "eksempel-snedker": {
    eksempel: true,
    navn: "Eksempel Snedkeri",
    type: "HomeAndConstructionBusiness",
    branche: "Snedker",
    beskrivelse: "Snedkerfirma på Sydfyn. Vi laver nye vinduer og døre, renoverer gamle og bygger køkkener og møbler efter mål.",
    adresse: { gade: "Eksempelvej 1", postnr: "5700", by: "Svendborg" },
    omraade: ["Svendborg", "Tåsinge", "Ærø", "Faaborg"],
    ydelser: [
      { navn: "Besigtigelse og tilbud", minutter: 60, pris: 0 },
      { navn: "Nye vinduer i træ", pris: 9500, fraPris: true },
      { navn: "Renovering af gamle vinduer", pris: 3500, fraPris: true },
      { navn: "Køkken efter mål", pris: 65000, fraPris: true },
    ],
    aabning: [{ dage: ["Mo", "Tu", "We", "Th", "Fr"], fra: "07:00", til: "16:00" }],
    bookingUrl: "https://klardal.com/firma/eksempel-snedker#kontakt",
  },
};

export const kundeOf = (slug: string) => (Object.hasOwn(KUNDER, slug) ? KUNDER[slug] : undefined);

export const kundeUrl = (slug: string) => `${(process.env.APP_URL || "https://klardal.com").replace(/\/$/, "")}/firma/${slug}`;
