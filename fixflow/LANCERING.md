# Sådan lancerer du Merova

En trin-for-trin-plan fra "appen virker på min computer" til "kunder kan betale". Punkterne er i den rækkefølge, de giver mening.

> **Vigtigt:** Dette er en praktisk tjekliste, ikke juridisk rådgivning. Få en advokat til at gennemgå handelsbetingelser og privatlivspolitik (typisk 3.000–10.000 kr.), og tal med en revisor om moms og bogføring. Det er godt givet ud, når du tager penge fra forbrugere.

---

## 1. Virksomheden (uge 1)

- [ ] **Registrér en virksomhed** på [virk.dk](https://virk.dk) – enkeltmandsvirksomhed (gratis) eller ApS (40.000 kr. i kapital). Med ApS hæfter du ikke personligt.
- [ ] **Momsregistrering**: krævet, når salget overstiger 50.000 kr. på 12 måneder. Priserne i appen er inkl. moms – så gør det fra start.
- [ ] **Digitalt bogføringssystem**: bogføringsloven kræver et registreret system (fx Dinero, Billy, e-conomic). Forbind det med Stripe.
- [ ] **Erhvervsbank-konto** til Stripe-udbetalinger.
- [ ] **Forsikring**: overvej en erhvervsansvars- og *professionel ansvarsforsikring* – du giver vejledning om store køb. Spørg også om cyberforsikring.
- [ ] **Varemærke**: tjek at "Merova" ikke er taget i Danmark/EU ([dkpto.dk](https://www.dkpto.dk), [euipo.europa.eu](https://euipo.europa.eu)), og køb domænet.

## 2. Jura i appen (uge 1–2)

Appen har allerede (gennemgået for forbrugeraftaleloven, markedsføringsloven, GDPR og AI-forordningen):

- **Handelsbetingelser** og **privatlivspolitik** med fortrydelsesret, standardfortrydelsesformular, mangelsregler, databehandlere og opbevaringsperioder. Udfyld `COMPANY_NAME`, `COMPANY_CVR`, `COMPANY_ADDRESS`, `CONTACT_EMAIL` og `COMPANY_PHONE` (i Render under *Environment*) – så forsvinder "Udkast"-advarslen. På andre sprog vises et oversat resumé af det vigtigste.
- **Samtykke ved køb**, forskelligt for engangskøb og Pro, med automatisk fornyelse nævnt ved knappen. Den præcise tekst og tidspunktet gemmes på betalingen.
- **Ordrebekræftelse på e-mail** med samtykke, fortrydelsesret og links til betingelserne (kræver `BREVO_API_KEY` og `EMAIL_FROM`).
- **»Fortryd købet«-knap** på kontosiden i 14 dage: ubrugt engangskøb refunderes fuldt, Pro forholdsmæssigt (49 kr. ÷ 30 pr. påbegyndt dag). Kan Stripe ikke refundere automatisk, får du en e-mail om at gøre det manuelt.
- **Opsigelse** når som helst – kunden beholder Pro perioden ud.
- **AI-oplysning** på forside, upload, analyse og beskeder. Eksempelfirmaer er tydeligt fiktive, og der er ingen opdigtede udtalelser eller "mest valgt"-påstande.
- **Ingen salg i demo-tilstand**: med Stripe slået til, men uden AI-nøgle, kan man ikke betale.
- **GDPR**: "Hent mine data" (alt, også låste detaljer), "Slet min konto", automatisk sletning efter 3 års inaktivitet.
- **CVR**: firmaer med reklamebeskyttelse vises ikke, og kilden står ved resultaterne.
- **Cookies**: kun to nødvendige (login og sprog) og ingen sporing → intet cookie-banner. Tilføjer du Google Analytics, Meta Pixel el.lign., **skal** du have et samtykke-banner.

Du skal selv:

- [ ] **Telefonnummer** til virksomheden (skal stå i betingelserne).
- [ ] **E-mail**: opret en gratis konto hos [Brevo](https://www.brevo.com), bekræft dit afsenderdomæne, og sæt `BREVO_API_KEY` og `EMAIL_FROM` i Render. Uden det sendes ingen ordrebekræftelser – og så må du ikke tage betaling.
- [ ] **Databehandleraftaler (DPA)** – accepteres typisk i hver tjenestes dashboard/vilkår:
  - **Render** (hosting), **Turso** (database og filer), **Brevo** (e-mail).
  - **Anthropic** – betalt API-konto under de kommercielle vilkår (indeholder DPA). Tjek kontraktpart, hvor længe data gemmes, og at de ikke bruges til træning – og ret privatlivspolitikken, hvis noget afviger.
  - Tjek for hver af dem, om de er certificeret under EU-US Data Privacy Framework.
  - Stripe er selvstændig dataansvarlig for kortbetalingen.
- [ ] **Advokat**: få bekræftet paragrafhenvisningerne, fortrydelsesknappen (EU-direktiv 2023/2673), ansvarsafsnittet og at Stripes betalingsknap er tydelig nok (Merova sætter teksten "Du forpligter dig til at betale …" over knappen).
- [ ] **Fortegnelse over behandlingsaktiviteter** (GDPR art. 30) – et simpelt dokument. Datatilsynet har skabeloner.
- [ ] **Procedure ved databrud**: hvem gør hvad, og anmeldelse til Datatilsynet inden for 72 timer.
- [ ] **Markedsføring**: priser skal altid vises inkl. moms (det gør appen). Send aldrig nyhedsbreve uden samtykke (markedsføringslovens § 10). Påstande som "spar 20.000 kr." skal kunne dokumenteres.
- [ ] **Håndværkere**: Merova viser offentlige CVR-oplysninger og anbefaler ikke bestemte firmaer – hold det sådan. Skriv aldrig negativt om navngivne firmaer i markedsføring.
- [ ] **AI-forordningen (EU AI Act)**: Merova er ikke højrisiko. Brugerne får at vide, at analysen og beskederne laves med AI – hold det sådan i al markedsføring.

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
- [ ] Respektér **reklamebeskyttelse** i CVR: Merova kontakter aldrig firmaer selv – det er brugeren, der sender sin egen tilbudsanmodning. Bliv ved med det.
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
- [x] **Kvitterings-e-mails** sendes af appen ved køb og fornyelse (kræver Brevo).
- [x] Fornyelse af Pro-perioden via Stripe-hændelsen `invoice.paid` (husk at vælge den hændelse i Stripes webhook).

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
