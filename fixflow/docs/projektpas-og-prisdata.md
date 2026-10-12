# Projektpas og anonyme prisdata – beskrivelse (intet er bygget)

Skrevet 11. oktober 2026 som svar på punkt 18 og 20. Begge dele kræver August's beslutning, før der bygges.

---

## 18. Projektpas i stedet for Pro (49 kr./md.)

### Hvor plan- og prislogikken ligger i dag

| Sted | Hvad det gør |
|---|---|
| `src/lib/plans.ts` | Priser (`PRO_PRICE_DKK`, `SINGLE_PRICE_DKK`), antal analyser (`FREE_ANALYSES_TOTAL`, `PRO_ANALYSES_PER_PERIOD`), periode (`PERIOD_DAYS`), `planLimit`, `getUsage`, `hasFullAccess`, `canCompare`, beta (`isBeta`). |
| `src/lib/quota.ts` | `consumeAnalysis` / `refundAnalysis`: hvilken kvote der betaler for en analyse (`chargedSource`: plan eller credit). |
| `src/lib/billing.ts` | `CheckoutKind = "PRO_MONTHLY" \| "SINGLE"`, `fulfill` (giver Pro eller et credit), `cancelPro`, fortrydelse og kvitteringsmails. |
| `src/app/api/billing/checkout`, `webhook`, `withdraw` | Stripe-betaling, abonnement og fortrydelse. |
| `src/db/schema.ts` | `users.plan` (FREE/PRO), `extraCredits`, `periodStart`/`periodUsed`, `planEndsAt`; `payments.kind`; `quotes.chargedSource`. |
| UI | `PricingCards`, `Paywall`, `DashboardNav` (plan-badge), `dashboard/konto`, `dashboard/upload`, `handelsbetingelser`, FAQ, `llms.txt`. |
| Tekster | `src/i18n/dict/*.ts` (plans, checkout, account, faq – alle 8 sprog). |

### Det skal ændres for et projektpas (fx 149–199 kr. for 5 tilbud i 3 måneder)

1. **Database:** en ny tabel `passes` (userId, analysesTotal = 5, used, startsAt, endsAt = +3 måneder, paymentId). Mit forslag er ikke at binde passet hårdt til et projektnavn, for folk navngiver projekter forskelligt. Sig i stedet "5 tilbud inden for 3 måneder – nok til ét projekt".
2. **Betaling:** ny `CheckoutKind = "PROJECT_PASS"` som en almindelig engangsbetaling i Stripe. Det giver intet abonnement, ingen automatisk fornyelse, ingen opsigelse og ingen fornyelseskvitteringer, og dermed mindre jura og mindre kode end Pro.
3. **Kvote:** `consumeAnalysis` bruger først et aktivt pas, så gratis-analysen og så credits. `chargedSource` får værdien `"pass"`, så en mislykket analyse kan refunderes til passet.
4. **Adgang:** `hasFullAccess` og `canCompare` er sande for analyser lavet med et aktivt pas, og for sammenligning, mens passet gælder.
5. **Fortrydelse:** passet er digitalt indhold/tjenesteydelse. Samtykketekst og fortrydelsesregler, fx hvad der sker, når 1 af 5 analyser er brugt, skal formuleres og godkendes af en jurist. Det er det største arbejde.
6. **UI og tekster (8 sprog):** et nyt kort i `PricingCards` i stedet for Pro, `Paywall`, kontosiden (resterende analyser og udløbsdato), nav-badge, handelsbetingelser, FAQ og `llms.txt`.
7. **Pro fjernes:** der er ingen betalende Pro-kunder (betaen er gratis), så Pro kan fjernes helt i stedet for at blive migreret.
8. **Tests:** køb, 6. analyse afvises, udløb efter 3 måneder, refusion ved fejl og fortrydelse.

**Skøn:** 1–2 dages arbejde plus juridisk gennemgang af fortrydelsesteksten.

**Min vurdering:** et projektpas passer bedre til, hvordan folk renoverer, end et abonnement. Men vi har endnu ingen data. Brugstallet "Tilbud nr. 2 i samme projekt" på `/dashboard/admin` viser, hvor mange der faktisk uploader flere tilbud. Er det få, er et billigere engangskøb måske vigtigere end et pas.

---

## 20. Anonyme prisdata til "Er prisen rimelig?"

### Forslag til datamodel (ny tabel `price_points`, uden kobling til bruger eller tilbud)

| Felt | Indhold | Hvorfor så groft |
|---|---|---|
| `job_type` | Type arbejde fra en fast liste (badeværelse, køkken, tag, vinduer, maling …), valgt af AI'en | Fri tekst kan indeholde navne og adresser |
| `region` | Landsdel (5 regioner) ud fra postnummeret. Aldrig selve postnummeret | Små postnumre plus beløb kan pege på én husstand |
| `month` | År og måned (fx 2026-10), ikke dato | En præcis dato gør det lettere at genkende |
| `quote_type` | Overslag / fast pris / timepris | Nødvendigt for at sammenligne |
| `total_kr` | Total inkl. moms, afrundet til nærmeste 1.000 kr. | Et præcist beløb kan genkendes af håndværkeren |
| `amounts_by_category` | Beløb pr. kategori (arbejdsløn, materialer, …), afrundet til nærmeste 500 kr. | Samme grund |
| `area_m2` | Kun hvis det står i tilbuddet, afrundet til hele m² | Valgfrit |

**Gemmes aldrig:** navne, adresser, postnumre, CVR, firmanavne, telefon, e-mail, fritekst, bruger-id, tilbuds-id, filer og præcise datoer.

### Privatlivsvurdering (skal godkendes – jeg er ikke jurist)

- **At lave de anonyme data er en behandling af personoplysninger.** Tilbuddet indeholder kundens navn og adresse. Det kræver et retsgrundlag, sandsynligvis legitim interesse (art. 6, stk. 1, litra f) med en interesseafvejning. Det kræver også, at formålet er foreneligt med det oprindelige (art. 6, stk. 4), og at det står i privatlivspolitikken, før vi begynder.
- **Når en række er gemt, er den anonym**, hvis kombinationen af landsdel, måned, jobtype og afrundede beløb ikke kan føres tilbage til en person. Derfor afrundingerne ovenfor, og derfor vises en statistik først, når der er mindst 10 tilbud i samme gruppe (k-anonymitet).
- **Konsekvens:** anonyme rækker slettes ikke, når en bruger sletter sin konto, fordi de ikke kan kobles til brugeren. Det skal stå i privatlivspolitikken.
- **Anbefaling:** en fravalgsmulighed ("Brug ikke mit tilbud i anonym prisstatistik") på upload-siden eller kontosiden. Og start først indsamlingen, når politikken er opdateret.
- **Håndværkernes priser:** samlede, anonyme gennemsnit pr. landsdel er efter min vurdering i orden. Vis aldrig enkelte tilbud.

**Næste skridt, hvis du siger ja:** opdatér privatlivspolitikken, tilføj tabellen og gem en række efter hver færdig analyse, men vis endnu intet. "Er prisen rimelig?" bliver først bygget på egne data, når der er nok af dem.
