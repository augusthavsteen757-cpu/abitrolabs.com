import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";
import { PRO_ANALYSES_PER_PERIOD, PRO_PRICE_DKK, SINGLE_PRICE_DKK } from "@/lib/plans";

export const metadata: Metadata = { title: "Handelsbetingelser" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <LegalPage title="Handelsbetingelser">
      <h2>Hvem er vi?</h2>
      <p>
        FixFlow drives af {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}. E-mail: {COMPANY.email}.
      </p>

      <h2>Hvad er FixFlow?</h2>
      <p>
        FixFlow er en digital tjeneste, der forklarer håndværkertilbud, peger på uklare punkter og mulige ekstraudgifter
        og hjælper dig med at stille spørgsmål. Analysen laves automatisk med kunstig intelligens og faste regler.
      </p>
      <p>
        <strong>Analysen er vejledende.</strong> Den er ikke juridisk, teknisk eller økonomisk rådgivning, og den kan
        indeholde fejl – fx hvis et dokument er utydeligt. Tilbudsscoren siger noget om, hvor tydeligt et tilbud er, ikke
        om håndværkerens faglige kvalitet. Kontrollér altid vigtige punkter med håndværkeren, og søg rådgivning ved store
        eller komplicerede opgaver.
      </p>
      <p>
        Funktionen <strong>Find håndværkere</strong> viser firmaer fra det offentlige CVR-register sorteret efter afstand.
        Vi anbefaler ikke bestemte firmaer og har ingen aftaler med dem.
      </p>

      <h2>Priser og betaling</h2>
      <ul>
        <li><strong>Gratis:</strong> 1 analyse.</li>
        <li><strong>Pro:</strong> {PRO_PRICE_DKK} kr. pr. måned inkl. moms, {PRO_ANALYSES_PER_PERIOD} analyser pr. 30-dages periode. Fornyes automatisk hver måned.</li>
        <li><strong>Engangskøb:</strong> {SINGLE_PRICE_DKK} kr. inkl. moms for én komplet analyse eller oplåsning af et analyseret tilbud.</li>
      </ul>
      <p>Alle priser er i danske kroner inkl. moms. Betaling sker med kort via Stripe. Ubrugte analyser overføres ikke til næste periode.</p>

      <h2>Opsigelse</h2>
      <p>
        Du kan opsige Pro når som helst på din kontoside. Du beholder Pro til udgangen af den periode, du har betalt for,
        og bliver ikke trukket igen. Du kan også slette din konto når som helst.
      </p>

      <h2>Fortrydelsesret</h2>
      <p>
        Som forbruger har du normalt 14 dages fortrydelsesret ved køb på nettet. Når du køber, beder vi dig bekræfte, at
        du vil have adgang med det samme. Dermed bortfalder fortrydelsesretten for de analyser, der er leveret
        (forbrugeraftalelovens § 18, stk. 2, nr. 13). For et Pro-abonnement kan du fortryde inden for 14 dage ved at
        skrive til {COMPANY.email}; du betaler da for den del af tjenesten, du har brugt.
      </p>

      <h2>Din brug af tjenesten</h2>
      <ul>
        <li>Du må kun uploade dokumenter, du har ret til at bruge – typisk tilbud, du selv har modtaget.</li>
        <li>Du må ikke forsøge at omgå sikkerheden, overbelaste tjenesten eller bruge den til ulovlige formål.</li>
        <li>Du er ansvarlig for at holde din adgangskode hemmelig.</li>
      </ul>
      <p>Vi kan lukke en konto, der bruges i strid med betingelserne.</p>

      <h2>Ansvar</h2>
      <p>
        Vi gør vores bedste for, at tjenesten virker og analyserne er rigtige, men kan ikke garantere, at de er fejlfri.
        Vi er ikke ansvarlige for beslutninger, du træffer på grundlag af en analyse, eller for håndværkerens arbejde. Vores
        samlede ansvar er begrænset til det beløb, du har betalt de seneste 12 måneder, medmindre andet følger af
        ufravigelig lovgivning.
      </p>

      <h2>Klager</h2>
      <p>
        Kontakt os på {COMPANY.email}, så finder vi en løsning. Kan vi ikke blive enige, kan du klage til Nævnenes Hus,
        Toldboden 2, 8800 Viborg, www.naevneneshus.dk.
      </p>

      <h2>Ændringer og lovvalg</h2>
      <p>
        Vi giver dig besked mindst 30 dage før væsentlige ændringer af betingelserne eller priserne. Dansk ret gælder.
      </p>
    </LegalPage>
  );
}
