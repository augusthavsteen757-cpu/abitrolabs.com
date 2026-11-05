import type { Plan } from "@/lib/signup";

/**
 * Personal sign-up links (klardal.com/tilmeld/<slug>): the form arrives filled in, so the firm only checks and corrects.
 * Only public business facts belong here (name, trade, package). Never phone numbers, e-mails or personal details.
 */
export type Branche = keyof typeof SERVICES;

/** Common services and typical durations per trade. Shown as suggestions the firm can untick. */
export const SERVICES = {
  frisoer: ["Dameklip (45 min)", "Herreklip (30 min)", "Børneklip (30 min)", "Farve (90 min)", "Striber og reflekser (120 min)", "Vask og føn (30 min)"],
  negle: ["Nyt sæt negle (90 min)", "Opfyldning (60 min)", "Gellak på hænder (45 min)", "Manicure (45 min)", "Pedicure (60 min)"],
  fodterapi: ["Fodbehandling (45 min)", "Fodbehandling for diabetikere (45 min)", "Neglebøjle (30 min)", "Indlæg og aftryk (30 min)"],
  hundefrisoer: ["Klipning af lille hund (90 min)", "Klipning af stor hund (120 min)", "Bad og føn (60 min)", "Trimning (90 min)", "Kloklip (15 min)"],
  vaerksted: ["Service (120 min)", "Olieskift (45 min)", "Dækskifte (30 min)", "Klargøring til syn (60 min)", "Fejlfinding (60 min)"],
  fysio: ["Første konsultation (60 min)", "Opfølgende behandling (30 min)", "Genoptræning (45 min)"],
  koereskole: ["Uforpligtende samtale (30 min)", "Køretime (45 min)", "Køretime, dobbelt (90 min)"],
  skoenhed: ["Ansigtsbehandling (60 min)", "Vipper og bryn (30 min)", "Voksbehandling (30 min)"],
  cafe: ["Bord til 2 (90 min)", "Bord til 4 (90 min)", "Selskab, 6 eller flere (120 min)"],
  haandvaerker: ["Besigtigelse og tilbud (60 min)"],
} as const;

export type Lead = { firma: string; branche: Branche; pakke: Plan; ydelser?: readonly string[]; aabningstider?: string };

export const LEADS: Record<string, Lead> = {
  "rask-klip": { firma: "Rask Klip", branche: "frisoer", pakke: "149", ydelser: ["Dameklip (45 min)", "Herreklip (30 min)", "Børneklip (30 min)", "Farve (90 min)", "Striber og reflekser (120 min)", "Vask og føn (30 min)"], aabningstider: "Tirsdag til fredag. Lukket mandag og lørdag." },
  "haarsmedien": { firma: "Hårsmedien", branche: "frisoer", pakke: "199" },
  "frisoer-nyt-look": { firma: "Frisør Nyt Look", branche: "frisoer", pakke: "199" },
  "den-lille-salon": { firma: "Den lille salon", branche: "frisoer", pakke: "199" },
  "hos-frisoeren": { firma: "Hos Frisøren", branche: "frisoer", pakke: "199" },
  "salon-beltoft": { firma: "Salon Beltoft", branche: "frisoer", pakke: "199" },
  "salon-kroeyer": { firma: "Salon Krøyer", branche: "frisoer", pakke: "199" },
  "hos-kiss": { firma: "Hos Kiss", branche: "frisoer", pakke: "199" },
  "dorthes-hair-design": { firma: "Dorthes Hair Design", branche: "frisoer", pakke: "199" },
  "salon-karizma": { firma: "Salon Karizma", branche: "frisoer", pakke: "199" },
  "frisoer-iben-moeller": { firma: "Frisør Iben Møller", branche: "frisoer", pakke: "199" },
  "frisoer-veis": { firma: "Frisør Veis", branche: "frisoer", pakke: "199" },
  "mini-nails": { firma: "Mini Nails", branche: "negle", pakke: "199" },
  "den-lille-negle-salon": { firma: "Den Lille Negle Salon", branche: "negle", pakke: "199" },
  "phuongs-beauty-salon": { firma: "Phuong's beauty salon", branche: "negle", pakke: "199" },
  "frisoer-camilla-steen": { firma: "Frisør Camilla Steen", branche: "frisoer", pakke: "199" },
  "dronningemaens-auto": { firma: "Dronningemaens Auto", branche: "vaerksted", pakke: "149" },
  "abc-haandvaerkeren": { firma: "Abc Håndværkeren", branche: "haandvaerker", pakke: "199" },
  "troldeskovs-hundesalon": { firma: "Troldeskovs Hundesalon", branche: "hundefrisoer", pakke: "199" },
  "fodterapi-kamilla-koelle": { firma: "Klinik for Fodterapi v/Kamilla Kølle", branche: "fodterapi", pakke: "199" },
  "fodterapi-annette-skjoldborg": { firma: "Klinik for Fodterapi v/Annette Skjoldborg", branche: "fodterapi", pakke: "199" },
  "fodterapi-skattergade": { firma: "Klinik for Fodterapi", branche: "fodterapi", pakke: "199" },
  "frisoer-kamille-kaas": { firma: "Frisør Kamille Kaas", branche: "frisoer", pakke: "149" },
  "pernille-panduro": { firma: "Pernille Panduro", branche: "frisoer", pakke: "199" },
  "sydfyns-sport-fysioterapi": { firma: "Sydfyns Sport & Fysioterapi", branche: "fysio", pakke: "199" },
  "connies-koereskole": { firma: "Connie's Køreskole", branche: "koereskole", pakke: "149" },
  "cafe-rouge": { firma: "Café Rouge", branche: "cafe", pakke: "199" },
  "kari-hof": { firma: "Kari Hof", branche: "skoenhed", pakke: "149" },
  "vvs-gaarden-svendborg": { firma: "VVS-gården Svendborg A/S", branche: "haandvaerker", pakke: "199" },
  "lisa-j-hairstylist": { firma: "Lisa J. Hairstylist", branche: "frisoer", pakke: "199" },
  "den-rullende-saks": { firma: "Den Rullende Saks", branche: "frisoer", pakke: "199" },
  "landro-gaardsalon": { firma: "Landro Gårdsalon", branche: "frisoer", pakke: "199" },
  "salon-lund": { firma: "Salon Lund", branche: "frisoer", pakke: "199" },
  "salon-country-cut": { firma: "Salon Country Cut", branche: "frisoer", pakke: "199" },
  "mettes-coiffure": { firma: "Mette's Coiffure", branche: "frisoer", pakke: "199" },
  "fruens-salon": { firma: "Fruens Salon", branche: "frisoer", pakke: "199" },
};

/** The lead's own services, or the usual ones for the trade. */
export const servicesFor = (lead: Lead): readonly string[] => lead.ydelser ?? SERVICES[lead.branche];
