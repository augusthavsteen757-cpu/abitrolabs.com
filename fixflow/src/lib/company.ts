/** Company details shown in the legal pages, footer and e-mails. Set them in the environment before launch. */
export const COMPANY = {
  name: process.env.COMPANY_NAME || "[Virksomhedens navn]",
  cvr: process.env.COMPANY_CVR || "[CVR-nummer]",
  address: process.env.COMPANY_ADDRESS || "[Adresse, postnummer og by]",
  email: process.env.CONTACT_EMAIL || "[kontakt@e-mail.dk]",
  /** Optional during the free beta (no sales); required before taking payments. */
  phone: process.env.COMPANY_PHONE || "",
};

export const isCompanyConfigured = () =>
  !!(
    process.env.COMPANY_NAME &&
    process.env.COMPANY_CVR &&
    process.env.COMPANY_ADDRESS &&
    process.env.CONTACT_EMAIL &&
    (process.env.COMPANY_PHONE || process.env.BETA_FREE === "1")
  );

export const LEGAL_UPDATED = "8. oktober 2026";

/** Days a consumer has to withdraw from a purchase (forbrugeraftaleloven § 18). */
export const WITHDRAWAL_DAYS = 14;
