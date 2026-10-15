import { COMPANY, isCompanyConfigured } from "@/lib/company";

// Common ways people mistype the name, so search engines can connect them to Klardal.
export const MISSPELLINGS = ["Klardahl", "Klaredahl", "Klaredal"];

/** Short, factual description of Klardal – the same sentence on the front page, /om and in structured data. */
export const ORG_DESCRIPTION =
  "Klardal er en dansk onlinetjeneste fra Svendborg, der forklarer håndværkertilbud for private boligejere: hvad der er uklart, hvad der kan gøre det dyrere, og hvad man kan spørge håndværkeren om.";

/** Klardal's own profiles elsewhere (Facebook, LinkedIn …), comma-separated in SOCIAL_LINKS. Only https URLs. */
export const socialLinks = () =>
  (process.env.SOCIAL_LINKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/[^\s"<>]+$/.test(s));

/**
 * Structured data that tells Google (and AI answers) what Klardal is. Static values only.
 * Only the town is given, not the street address.
 */
export function organizationJsonLd(base: string) {
  const url = `${base.replace(/\/$/, "")}/`;
  const sameAs = socialLinks();
  return {
    "@type": "Organization",
    "@id": `${url}#organization`,
    name: "Klardal",
    alternateName: MISSPELLINGS,
    url,
    logo: `${url}logo.png`,
    description: ORG_DESCRIPTION,
    foundingDate: "2026",
    areaServed: { "@type": "Country", name: "Danmark" },
    address: { "@type": "PostalAddress", addressLocality: "Svendborg", postalCode: "5700", addressCountry: "DK" },
    ...(isCompanyConfigured() ? { email: COMPANY.email, identifier: { "@type": "PropertyValue", propertyID: "CVR", value: COMPANY.cvr } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
