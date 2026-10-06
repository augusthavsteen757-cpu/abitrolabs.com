/** Company details shown in the legal pages and footer. Set them in .env before launch. */
export const COMPANY = {
  name: process.env.COMPANY_NAME || "[Virksomhedens navn]",
  cvr: process.env.COMPANY_CVR || "[CVR-nummer]",
  address: process.env.COMPANY_ADDRESS || "[Adresse, postnummer og by]",
  email: process.env.CONTACT_EMAIL || "[kontakt@e-mail.dk]",
  hosting: process.env.HOSTING_PROVIDER || "[Hostingudbyder, fx Vercel Inc. / Hetzner Online GmbH]",
};

export const isCompanyConfigured = () =>
  !!(process.env.COMPANY_NAME && process.env.COMPANY_CVR && process.env.COMPANY_ADDRESS && process.env.CONTACT_EMAIL);

export const LEGAL_UPDATED = "6. oktober 2026";
