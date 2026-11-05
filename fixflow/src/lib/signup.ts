import { z } from "zod";
import { normalizePhone } from "@/lib/callback";

/** The two packages on the front page – same content, the 199 kr one includes a website. */
export const PLANS = {
  "149": "149 kr/md: vi har allerede en hjemmeside",
  "199": "199 kr/md: inklusive en ny hjemmeside",
} as const;
export type Plan = keyof typeof PLANS;

/** Automatic monthly payment. Card runs through Stripe; MobilePay and Betalingsservice through their own agreements. */
export const PAYMENTS = {
  kort: "Betalingskort",
  mobilepay: "MobilePay",
  betalingsservice: "Betalingsservice",
} as const;
export type Payment = keyof typeof PAYMENTS;

/** Extras that can be added later (price agreed before we start). */
export const EXTRAS = {
  anmeldelser: "Svar på Google-anmeldelser",
  opslag: "Opslag til Facebook og Instagram",
  nyhedsbrev: "Nyhedsbreve og tilbud til faste kunder",
  komigen: "SMS, der får kunder til at komme igen",
} as const;

const clean = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((s) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max));

export const signupSchema = z.object({
  firma: clean(120).pipe(z.string().min(1, "Skriv firmaets navn.")),
  navn: clean(120).pipe(z.string().min(1, "Skriv dit navn.")),
  telefon: z.string().max(40).transform((s, ctx) => {
    const p = normalizePhone(s);
    if (!p) ctx.addIssue({ code: "custom", message: "Skriv et dansk telefonnummer med 8 cifre." });
    return p ?? "";
  }),
  email: clean(200).pipe(z.string().email("Skriv en gyldig e-mail.")),
  cvr: clean(20).optional().default(""),
  pakke: z.enum(["149", "199"], { message: "Vælg en pakke." }),
  besked: z.enum(["mail", "sms"]).default("mail"),
  behandlinger: clean(2000).optional().default(""),
  aabningstider: clean(500).optional().default(""),
  billeder: z.boolean().default(false),
  tilvalg: z.array(z.enum(Object.keys(EXTRAS) as [keyof typeof EXTRAS, ...(keyof typeof EXTRAS)[]])).max(4).default([]),
  betaling: z.enum(["kort", "mobilepay", "betalingsservice"], { message: "Vælg hvordan I vil betale." }).default("kort"),
  accept: z.literal(true, { message: "Sæt kryds i boksen nederst, før I sender." }),
});
export type Signup = z.infer<typeof signupSchema>;

/** Plain-text summary for the e-mail to Klardal. */
export function signupSummary(s: Signup): string {
  return [
    `Firma: ${s.firma}${s.cvr ? ` (CVR ${s.cvr})` : ""}`,
    `Kontakt: ${s.navn}, ${s.telefon}, ${s.email}`,
    `Pakke: ${PLANS[s.pakke]}`,
    `Bookinger sendes på: ${s.besked === "sms" ? "SMS" : "mail"}`,
    `Behandlinger: ${s.behandlinger || "ikke udfyldt – ring og spørg"}`,
    `Åbningstider: ${s.aabningstider || "ikke udfyldt – brug dem fra Google"}`,
    `Må bruge billeder fra hjemmeside/Facebook: ${s.billeder ? "ja" : "nej"}`,
    `Tilvalg (pris aftales): ${s.tilvalg.length ? s.tilvalg.map((t) => EXTRAS[t]).join(", ") : "ingen"}`,
    `Betaling (automatisk hver måned): ${PAYMENTS[s.betaling]}`,
    `Accepteret: vilkår og databehandleraftale (klardal.com/vilkaar, klardal.com/databehandleraftale)`,
  ].join("\n");
}
