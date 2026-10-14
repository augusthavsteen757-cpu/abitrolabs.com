/**
 * Company details shown in the legal pages, footer and e-mails – the only place they live. Set them in
 * the environment (Render → fixflow → Environment); when the CVR number arrives, change COMPANY_CVR there.
 */
export const COMPANY = {
  name: process.env.COMPANY_NAME || "[Virksomhedens navn]",
  cvr: process.env.COMPANY_CVR || "[CVR-nummer]",
  address: process.env.COMPANY_ADDRESS || "[Adresse, postnummer og by]",
  email: process.env.CONTACT_EMAIL || "[kontakt@e-mail.dk]",
  /** Shown on the front page, in the footer and the legal pages. COMPANY_PHONE overrides it. */
  phone: process.env.COMPANY_PHONE || "60 88 39 74",
  /** COMPANY_FOOTER_ADDRESS=0 shows name, CVR and e-mail in the footer without the address. The legal pages always show it. */
  addressInFooter: process.env.COMPANY_FOOTER_ADDRESS !== "0",
};

/** "60 88 39 74" → "tel:+4560883974" for a tap-to-call link. */
export const phoneHref = (phone: string) => `tel:${phone.startsWith("+") ? "" : "+45"}${phone.replace(/[^\d+]/g, "")}`;

export const isCompanyConfigured = () =>
  !!(
    process.env.COMPANY_NAME &&
    process.env.COMPANY_CVR &&
    process.env.COMPANY_ADDRESS &&
    process.env.CONTACT_EMAIL
  );

export const LEGAL_UPDATED = "14. oktober 2026";

/** Days a consumer has to withdraw from a purchase (forbrugeraftaleloven § 18). */
export const WITHDRAWAL_DAYS = 14;
