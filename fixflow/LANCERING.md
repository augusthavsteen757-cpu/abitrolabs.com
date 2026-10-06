# Sådan lancerer du FixFlow

En trin-for-trin-plan fra "appen virker på min computer" til "kunder kan betale". Punkterne er i den rækkefølge, de giver mening.

> **Vigtigt:** Dette er en praktisk tjekliste, ikke juridisk rådgivning. Få en advokat til at gennemgå handelsbetingelser og privatlivspolitik (typisk 3.000–10.000 kr.), og tal med en revisor om moms og bogføring. Det er godt givet ud, når du tager penge fra forbrugere.

---

## 1. Virksomheden (uge 1)

- [ ] **Registrér en virksomhed** på [virk.dk](https://virk.dk) – enkeltmandsvirksomhed (gratis) eller ApS (40.000 kr. i kapital). Med ApS hæfter du ikke personligt.
- [ ] **Momsregistrering**: krævet, når salget overstiger 50.000 kr. på 12 måneder. Priserne i appen er inkl. moms – så gør det fra start.
- [ ] **Digitalt bogføringssystem**: bogføringsloven kræver et registreret system (fx Dinero, Billy, e-conomic). Forbind det med Stripe.
- [ ] **Erhvervsbank-konto** til Stripe-udbetalinger.
- [ ] **Forsikring**: overvej en erhvervsansvars- og *professionel ansvarsforsikring* – du giver vejledning om store køb. Spørg også om cyberforsikring.
- [ ] **Varemærke**: tjek at "FixFlow" ikke er taget i Danmark/EU ([dkpto.dk](https://www.dkpto.dk), [euipo.europa.eu](https://euipo.europa.eu)), og køb domænet.

## 2. Jura i appen (uge 1–2)

Appen har allerede:

- **Handelsbetingelser** (`/handelsbetingelser`) og **privatlivspolitik** (`/privatlivspolitik`) som udkast. Udfyld `COMPANY_NAME`, `COMPANY_CVR`, `COMPANY_ADDRESS`, `CONTACT_EMAIL` og `HOSTING_PROVIDER` i `.env` – så forsvinder "Udkast"-advarslen. **Få en advokat til at læse dem.**
- **Accept ved oprettelse** af handelsbetingelser og privatlivspolitik (tidspunktet gemmes).
- **Fortrydelsesret**: kunden skal sætte flueben for at få adgang med det samme, før de kan betale (forbrugeraftalelovens § 18). Tidspunktet gemmes på betalingen.
- **Opsigelse** når som helst – kunden beholder Pro perioden ud.
- **GDPR-rettigheder**: "Hent mine data" (indsigt/dataportabilitet) og "Slet min konto" på kontosiden. Betalinger gemmes anonymt i 5 år (bogføringsloven).
- **Cookies**: kun én nødvendig login-cookie og ingen sporing → ingen cookie-banner nødvendig. Tilføjer du Google Analytics, Meta Pixel el.lign., **skal** du have et samtykke-banner.
- **Tydelig ansvarsfraskrivelse**: analysen er vejledende og ikke rådgivning.

Du skal selv:

- [ ] **Databehandleraftaler (DPA)** med alle, der behandler persondata for dig:
  - Hosting (Vercel/Hetzner/…) – accepteres typisk i deres dashboard.
  - **Anthropic** – brug en betalt API-konto under Anthropics kommercielle vilkår (indeholder DPA). Tjek at data ikke bruges til træning.
  - Stripe – indgår i Stripes vilkår.
- [ ] **Fortegnelse over behandlingsaktiviteter** (GDPR art. 30) – et simpelt dokument. Datatilsynet har skabeloner.
- [ ] **Procedure ved databrud**: hvem gør hvad, og anmeldelse til Datatilsynet inden for 72 timer.
- [ ] **Markedsføring**: priser skal altid vises inkl. moms (det gør appen). Send aldrig nyhedsbreve uden samtykke (markedsføringslovens § 10). Påstande som "spar 20.000 kr." skal kunne dokumenteres.
- [ ] **Håndværkere**: FixFlow viser offentlige CVR-oplysninger og anbefaler ikke bestemte firmaer – hold det sådan. Skriv aldrig negativt om navngivne firmaer i markedsføring.
- [ ] **AI-forordningen (EU AI Act)**: FixFlow er ikke højrisiko, men brugerne skal vide, at analysen laves med AI – det står i handelsbetingelserne. Nævn det også på forsiden/FAQ.

## 3. Rigtig AI-analyse (uge 2)

- [ ] Opret en konto på [console.anthropic.com](https://console.anthropic.com), sæt et **månedligt forbrugsloft**, og sæt `ANTHROPIC_API_KEY`.
- [ ] Test 10–20 **rigtige** tilbud (PDF og mobilbilleder) – også dårlige billeder og ting, der ikke er tilbud. Ret systemprompten i `src/lib/ai.ts`, hvis noget går galt.
- [ ] Udregn prisen pr. analyse (typisk få kroner) og sammenlign med 49/99 kr.

## 4. Betaling (uge 2)

- [ ] Opret en **Stripe**-konto (dansk virksomhed), og gennemfør verificeringen.
- [ ] Følg afsnittet *Stripe* i `README.md`: to produkter, webhook og miljøvariabler.
- [ ] Slå **Stripe Tax** eller fast 25 % moms til, og vis CVR på kvitteringer.
- [ ] Test med testkort: køb Pro, køb engangskøb, opsig, fejlet betaling.

## 5. Find håndværkere (uge 2–3)

- [ ] Søg om gratis adgang til **CVR-registrets system-til-system-søgning** hos Erhvervsstyrelsen (søg "CVR system til system adgang" på virk.dk). Du får brugernavn og adgangskode → `CVR_ES_USER` og `CVR_ES_PASSWORD`.
- [ ] Test søgningen og tjek branchekoderne i `src/lib/contractors.ts` mod Danmarks Statistiks DB07-liste.
- [ ] Respektér **reklamebeskyttelse** i CVR: FixFlow kontakter aldrig firmaer selv – det er brugeren, der sender sin egen tilbudsanmodning. Bliv ved med det.
- [ ] Valgfrit: sæt `GEO_API_URL` til en officiel adresse-API for præcise afstande (ellers bruges omtrentlige bymidter).

## 6. Drift og sikkerhed (uge 3)

Appen har allerede: HTTPS-krav (HSTS), stram Content Security Policy, beskyttelse mod CSRF og clickjacking, rate limiting på login/oprettelse/upload/beskeder, adgangskoder med bcrypt, krav om stærke adgangskoder, "log ud alle steder", tjek af filtyper ved upload, adgangskontrol på alle tilbud og filer, signerede Stripe-webhooks og beskyttelse mod "prompt injection" i tilbud. Afhængighederne har 0 kendte sårbarheder ved seneste `npm audit`.

Du skal selv:

- [ ] **Hosting** – vælg én:
  - *Enklest:* en lille server i EU (fx Hetzner i Tyskland/Finland) med Docker (`Dockerfile` er klar) + [Caddy](https://caddyserver.com) for automatisk HTTPS. Data bliver i EU.
  - *Vercel + Turso + objektlager* (se README). Vælg EU-regioner.
- [ ] Generér en ny **`AUTH_SECRET`**: `openssl rand -base64 32`. Del den aldrig, og læg den aldrig i Git.
- [ ] **Backup** af databasen og uploads hver nat, gemt et andet sted – og test at du kan genskabe.
- [ ] **Overvågning**: fejl (fx Sentry, EU-region) og oppetid (fx UptimeRobot).
- [ ] **Opdateringer**: kør `npm audit` og opdatér Next.js mindst en gang om måneden. Slå GitHub Dependabot til.
- [ ] **2-faktor-login** på alle dine egne konti: GitHub, hosting, Stripe, Anthropic, domæne, e-mail.
- [ ] **Slet demo-brugeren** i produktion (seed er blokeret i produktion som standard).
- [ ] Overvej en **ekstern sikkerhedstest** (penetrationstest), når der er betalende kunder.

Mangler stadig i koden (gør det før eller kort efter lancering):

- [ ] **Glemt adgangskode** via e-mail (kræver en e-mailtjeneste, fx Postmark eller Brevo i EU).
- [ ] **Bekræftelse af e-mail** ved oprettelse.
- [ ] **Kvitterings-e-mails** (Stripe kan sende dem automatisk – slå det til).
- [ ] Fornyelse af Pro-perioden via Stripe-hændelsen `invoice.paid`.

## 7. Lancering (uge 4)

- [ ] Gennemgå appen på mobil og computer med 5 venner/familie, der har fået et rigtigt tilbud.
- [ ] Sæt domænet op, og tjek at `https://` virker, og at `http://` sender videre.
- [ ] Kør tjeklisten igen: `.env` udfyldt, juridiske sider uden "Udkast", Stripe i live-tilstand, backup kører.
- [ ] Start småt: Facebook-grupper om husbyggeri/renovering, boligforeninger, Reddit r/Denmark – vær ærlig om, at det er nyt.

---

## Kort fortalt – det skal du betale for

| Hvad | Ca. pris |
| --- | --- |
| Domæne | 100 kr./år |
| Server (Hetzner + Docker) | 50–150 kr./md. |
| Anthropic API | få kr. pr. analyse |
| Stripe | 1,5 % + 1,80 kr. pr. kortbetaling (EU-kort) |
| Bogføringsprogram | 0–200 kr./md. |
| Advokat (gennemgang af vilkår) | 3.000–10.000 kr. engangs |
| Forsikring | spørg dit forsikringsselskab |
