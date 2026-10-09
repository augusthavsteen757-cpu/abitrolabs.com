# Klardal

**Forstå dit håndværkertilbud — før du skriver under.**

Klardal er en dansk SaaS-webapp, der hjælper boligejere med at forstå håndværkertilbud. Brugeren uploader et tilbud (PDF eller foto) og får:

- en **Tilbudsscore** (0–100), beregnet efter faste regler i koden – ikke af AI'en
- **røde flag**: skjulte udgifter, uklare poster, manglende oplysninger og vilkår
- en forklaring af **hver post** på almindeligt dansk
- en **10-punkts tjekliste** (CVR, betalingsplan, garanti, tidsplan …)
- konkrete **spørgsmål til håndværkeren** og en **beskedgenerator**
- **sammenligning** af op til 4 tilbud, inkl. "værste scenarie", afstand og et "bedste samlede match"
- **Find håndværkere** i nærheden (CVR-registret) og en færdig **tilbudsanmodning**, så tilbuddene bliver nemme at sammenligne

**Skal du lancere?** Se [LANCERING.md](./LANCERING.md) – en trin-for-trin-plan for virksomhed, jura, betaling, sikkerhed og drift.

Vi sælger ikke AI – vi sælger tryghed.

---

## Kom i gang

Kræver Node.js 20+. Bygget med Next.js 15.

```bash
cd fixflow
cp .env.example .env      # tilpas evt. værdierne
npm install
npm run setup             # opretter databasen (drizzle-kit push) og indlæser demo-data
npm run dev               # http://localhost:3000
```

### Demo-login

| E-mail            | Adgangskode |
| ----------------- | ----------- |
| `demo@klardal.dk` | `demo1234`  |

Demo-brugeren har Pro og tre badeværelsestilbud i projektet "Nyt badeværelse" samt én gemt besked.

### Demo-tilstand (uden AI-nøgle)

Er `ANTHROPIC_API_KEY` tom, kører appen i **demo-tilstand**: uploads giver realistiske danske eksempel-analyser (valgt ud fra filnavnet – fx "hansen", "nordvest", "kbh", "vindue" – ellers deterministisk ud fra et hash), med ca. 1,8 sekunders kunstig ventetid. Beskedgeneratoren bruger skabeloner. Der vises et gult banner i dashboardet.

Rigtige analyser: sæt `ANTHROPIC_API_KEY` i `.env`. Modellen styres med `ANTHROPIC_MODEL` (standard `claude-sonnet-5-5`).

### Eksempel-tilbud

`sample-quotes/` indeholder 4 **fiktive** tilbud (mærket "FIKTIVT EKSEMPEL"), som genereres af `npm run db:seed`:

| Fil                              | Firma                        | Prisform  | Score |
| -------------------------------- | ---------------------------- | --------- | ----- |
| `hansen-soen-badevaerelse.pdf`   | Hansen & Søn VVS-Byg ApS     | Overslag  | 36    |
| `nordvest-badevaerelser.pdf`     | Nordvest Badeværelser A/S    | Fast pris | 93    |
| `kbh-totalbyg.pdf`               | KBH Totalbyg                 | Uklar     | 16    |
| `lys-og-luft-vinduer.pdf`        | Lys & Luft Vinduer ApS       | Tilbud    | 78    |

Alle firmanavne, CVR-numre og kontaktoplysninger er opdigtede.

---

## Scripts

| Script               | Hvad det gør                                                |
| -------------------- | ----------------------------------------------------------- |
| `npm run dev`        | Udviklingsserver                                            |
| `npm run build`      | Produktionsbuild (`output: "standalone"`)                   |
| `npm run start`      | Starter produktionsbuildet                                  |
| `npm run typecheck`  | TypeScript-tjek (strict)                                    |
| `npm run db:push`    | Opretter/opdaterer tabellerne (drizzle-kit push)            |
| `npm run db:seed`    | Genererer eksempel-PDF'er og demo-brugeren                  |
| `npm run setup`      | `db:push` + `db:seed`                                       |
| `npm run test:e2e`   | Playwright-gennemgang af hovedflowene (kræver kørende app)  |

`test:e2e` forventer en kørende app i demo-tilstand med seed-data: `BASE_URL=http://localhost:3000 CHROMIUM_PATH=/sti/til/chrome npm run test:e2e`. Den tester signup → upload → analyse → betalingsmur → engangskøb → oplåsning → sletning, demo-login → sammenligning → "Spørg håndværkeren" → besked → konto, og at ingen sider scroller vandret ved 390 px, samt at der ingen konsolfejl er.

---

## Forretningsmodel

Defineret i `src/lib/plans.ts`.

| Plan            | Pris        | Indhold                                                                                         |
| --------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| **Gratis**      | 0 kr.       | 1 analyse i alt: score, flag, forklaringer, 3 spørgsmål. Ingen beskedgenerator/sammenligning.   |
| **Pro**         | 49 kr./md.  | 10 analyser pr. 30-dages periode, sammenligning, alle spørgsmål, beskedgenerator, historik.     |
| **Engangskøb**  | 99 kr.      | +1 kredit = én komplet analyse. Kan også låse et allerede analyseret tilbud op.                 |

- Plan-kvoten bruges før kreditter.
- Analyser lavet med Pro eller en kredit bliver `unlocked`.
- Mislykkes en analyse, refunderes kvoten/kreditten, og tilbuddet markeres `FAILED` med en dansk fejlbesked (med "Prøv igen").
- Uden `STRIPE_SECRET_KEY` simuleres betalinger ("Testtilstand") og registreres i `payments` med `provider = "simulated"`.

---

## Projektstruktur

```
fixflow/
├─ scripts/
│  ├─ seed.ts            # demo-bruger + fiktive PDF'er
│  └─ e2e.mjs            # Playwright-gennemgang
├─ sample-quotes/        # genererede fiktive tilbud
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                  # landingsside
│  │  ├─ priser/, login/, opret/   # marketing + auth
│  │  ├─ dashboard/
│  │  │  ├─ page.tsx               # oversigt
│  │  │  ├─ upload/                # nyt tilbud
│  │  │  ├─ tilbud/[id]/           # analysesiden
│  │  │  ├─ sammenlign/            # sammenligning (Pro)
│  │  │  └─ konto/                 # abonnement og betalinger
│  │  └─ api/
│  │     ├─ auth/{signup,login,logout}
│  │     ├─ quotes/ og quotes/[id]/{file,message,unlock}
│  │     └─ billing/{checkout,webhook}
│  ├─ components/        # UI-komponenter
│  ├─ db/                # Drizzle-skema og klient (libSQL)
│  ├─ lib/
│  │  ├─ ai.ts           # Claude-analyse (tool use + Zod) og beskeder
│  │  ├─ analysis.ts     # QuoteAnalysis-typer, validering, hjælpefunktioner
│  │  ├─ score.ts        # deterministisk Tilbudsscore
│  │  ├─ plans.ts        # planer og forbrug
│  │  ├─ quota.ts        # forbrug/refundering af analyser
│  │  ├─ billing.ts      # simuleret betaling + Stripe Checkout (REST)
│  │  ├─ storage.ts      # fil-lager (lokal disk, kan skiftes til S3/R2)
│  │  ├─ auth.ts, session.ts  # bcrypt + JWT i httpOnly-cookie "ff_session"
│  │  └─ demo-data.ts    # håndskrevne eksempel-analyser
│  └─ middleware.ts      # sender /dashboard/* til /login uden cookie
├─ Dockerfile
└─ drizzle.config.ts
```

### Tilbudsscore

Beregnes i `src/lib/score.ts`:

- **Specificering (30)**: andel af beløbet i tydelige poster (tydelig = 1, delvist = 0,5, uklar = 0)
- **Fuldstændighed (30)**: punkter i tjeklisten der er med / 10
- **Prisform & vilkår (20)**: fast pris 20, tilbud 16, overslag 9, uklart 4; −3 pr. vilkårs-flag
- **Risiko for ekstraudgifter (20)**: 20 − (høj 6, middel 3, lav 1) for øvrige flag

≥80 Gennemsigtigt · ≥60 Rimeligt klart · ≥40 Uklart · ellers Meget uklart.

---

## Deploy

### Docker (simplest)

```bash
docker build -t fixflow .
docker run -p 3000:3000 -v fixflow-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e APP_URL=https://dit-domæne.dk \
  fixflow
```

Databasen (`/data/fixflow.db`) og uploads (`/data/uploads`) ligger i volumen `/data`. Containeren kører `drizzle-kit push` ved opstart. Kør bag HTTPS (fx Caddy eller en load balancer) – login-cookien er `Secure` i produktion. Til test over ren HTTP kan du sætte `ALLOW_INSECURE_COOKIES=1`.

Demo-data indlæses ikke automatisk i containeren. Vil du have demo-brugeren med, så kør `npm run db:seed` lokalt med `DATABASE_URL`/`UPLOAD_DIR` pegende på samme data.

### Gratis: Render + Turso

`render.yaml` i repoets rod er en Render Blueprint (gratis plan, Frankfurt).

1. Opret en database på [Turso](https://app.turso.tech) og lav et token (`turso db tokens create <navn>`).
2. På Render: **New → Blueprint**, vælg repoet. Udfyld `DATABASE_URL` (`libsql://…`) og `DATABASE_AUTH_TOKEN`. `AUTH_SECRET` genereres automatisk.
3. Uploadede filer gemmes i databasen (`STORAGE_DRIVER=db`), fordi Render free ikke har en permanent disk.
4. Den gratis plan "sover" efter 15 minutter uden besøg; første besøg tager derefter ca. et minut.

### Vercel + Turso + objektlager

1. Opret en database på [Turso](https://turso.tech) og sæt `DATABASE_URL=libsql://...` og `DATABASE_AUTH_TOKEN`.
2. Kør `npm run db:push` lokalt med de samme variabler for at oprette tabellerne.
3. Vercels filsystem er ikke permanent: udskift implementeringen i `src/lib/storage.ts` (`saveFile`, `readStoredFile`, `deleteStoredFile`) med S3 / Cloudflare R2 / Vercel Blob. Resten af appen bruger kun disse tre funktioner.
4. Importér repoet i Vercel med **Root Directory = `fixflow`**, og sæt miljøvariablerne fra `.env.example`.
5. Analyse-ruten har `maxDuration = 120` – kræver en Vercel-plan, der tillader det.

---

## Sprog

Appen findes på dansk, engelsk, svensk, norsk, tysk, polsk, ukrainsk og rumænsk. Sproget vælges i sprogvælgeren
(gemmes i cookien `ff_lang`) – ellers bruges browserens sprog, og dansk som standard.

- Tekster ligger i `src/i18n/dict/` – `da.ts` er kilden, de andre skal have præcis samme nøgler (TypeScript tjekker det).
- AI-analysen og beskeder til håndværkeren skrives på brugerens sprog. Demo-analyserne findes kun på dansk.
- Handelsbetingelser og privatlivspolitik er kun på dansk (den juridisk gældende version).
- Tilbudsforespørgsler til håndværkere sendes altid på dansk.
- Oversættelserne er maskinoversat – lad gerne en, der har sproget som modersmål, læse dem igennem før lancering.

## Find håndværkere i nærheden

`/dashboard/find`: vælg fag, postnummer og afstand. Med `CVR_ES_USER`/`CVR_ES_PASSWORD` (gratis adgang til CVR's system-til-system-søgning hos Erhvervsstyrelsen) søges der i rigtige, aktive firmaer efter branchekode; uden adgang vises tydeligt markerede fiktive demo-firmaer. Afstande beregnes ud fra postnumre (`src/lib/geo.ts`) – med en indbygget tabel over bymidter (omtrentlig) eller en DAWA-kompatibel API via `GEO_API_URL`. Firmaer sorteres efter afstand; Klardal vurderer ikke firmaernes kvalitet. Brugeren sender selv tilbudsanmodningen – appen kontakter aldrig firmaer.

## Sikkerhed

- Next.js 15.5 (rettede kritiske sårbarheder i 14.x) – `npm audit --omit=dev`: 0 sårbarheder.
- Sikkerhedsheadere: Content Security Policy, HSTS, X-Frame-Options, nosniff, Referrer- og Permissions-Policy (`next.config.mjs`).
- CSRF: alle ændrende API-kald skal komme fra samme origin (`src/middleware.ts`) + SameSite-cookie.
- Login: bcrypt (cost 12), krav om stærke adgangskoder, ens svartid uanset om e-mailen findes, rate limiting pr. IP og pr. konto, "log ud alle steder" og skift af adgangskode ugyldiggør gamle sessioner.
- Rate limiting i databasen (virker på tværs af servere): login, oprettelse, upload, beskeder, køb, søgning.
- Upload: kun PDF/JPG/PNG/WEBP efter filens indhold (magic bytes), maks. 10 MB, gemt uden for webroden med tilfældige navne og beskyttelse mod path traversal; filer kan kun hentes af ejeren.
- Adgangskontrol: alle tilbud, filer og beskeder slås op med både id og bruger-id.
- AI: dokumenter behandles som data – systemprompten afviser instruktioner i tilbuddet.
- Stripe-webhooks verificeres med signatur og er idempotente.

## Jura

- Handelsbetingelser (`/handelsbetingelser`) og privatlivspolitik med cookie-information (`/privatlivspolitik`) – udfyld `COMPANY_*` og få dem gennemgået af en advokat.
- Accept af vilkår ved oprettelse, samtykke til straks-levering før køb (fortrydelsesret), opsigelse til periodens udløb.
- GDPR: dataeksport og kontosletning på kontosiden; betalinger gemmes uden navn og e-mail i 5 år (bogføringsloven).

## Stripe

Uden `STRIPE_SECRET_KEY` er betaling simuleret. Sådan slår du rigtig betaling til:

1. Opret to produkter i Stripe: **Pro** (49 kr./md., recurring) og **Engangskøb** (99 kr., one-time). Notér pris-id'erne.
2. Sæt `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_SINGLE` og `APP_URL`.
3. Opret et webhook-endpoint til `https://dit-domæne.dk/api/billing/webhook` med hændelserne `checkout.session.completed`, `invoice.paid` og `customer.subscription.deleted`, og sæt `STRIPE_WEBHOOK_SECRET`.
4. `/api/billing/checkout` returnerer nu `{ url }` til Stripe Checkout, og webhooken giver Pro/kredit (idempotent via `payments.reference`).
5. Ved fortrydelse refunderer appen automatisk via Stripe (`/v1/refunds`). Kunden får kvittering og ordrebekræftelse på e-mail (Brevo).

---

## Tjekliste før lancering

- [ ] Lang, tilfældig `AUTH_SECRET` (mindst 32 tegn)
- [ ] `ANTHROPIC_API_KEY` sat og et par rigtige tilbud testet (PDF og mobilfoto)
- [ ] Stripe sat op og testet med testkort, inkl. webhook og opsigelse
- [ ] Fillager flyttet til S3/R2 (hvis ikke Docker med permanent volumen)
- [ ] Backup af databasen
- [ ] HTTPS og eget domæne
- [ ] Handelsbetingelser, privatlivspolitik og cookie-information (GDPR) – tilbud kan indeholde navne og adresser
- [ ] Databehandleraftaler med hosting, Anthropic og Stripe
- [ ] Rate limiting på login, signup og upload
- [ ] Glemt adgangskode-flow og e-mailbekræftelse
- [ ] Fejlovervågning (fx Sentry) og logning
- [ ] Fjern eller skift demo-brugeren i produktion
- [ ] `npm audit` og opdatering af afhængigheder

> Analyserne er vejledende og erstatter ikke juridisk eller byggeteknisk rådgivning.
