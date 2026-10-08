import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Privatlivspolitik" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privatlivspolitik">
      <p>
        Her kan du læse, hvilke oplysninger Merova behandler om dig, hvorfor, og hvilke rettigheder du har. Vi indsamler
        kun det, der er nødvendigt for at levere tjenesten.
      </p>

      <h2>Dataansvarlig</h2>
      <p>
        {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}. E-mail: {COMPANY.email}.
      </p>

      <h2>Hvilke oplysninger behandler vi?</h2>
      <ul>
        <li><strong>Konto:</strong> navn, e-mail og din adgangskode (gemt krypteret som et bcrypt-hash – vi kan ikke se den).</li>
        <li><strong>Postnummer</strong>, hvis du angiver det, så vi kan finde håndværkere i nærheden og vise afstande.</li>
        <li>
          <strong>Tilbud du uploader</strong> og analysen af dem. Et tilbud kan indeholde dit navn og din adresse samt
          håndværkerens oplysninger. Upload kun tilbud, du selv har modtaget.
        </li>
        <li><strong>Beskeder</strong>, du laver med beskedgeneratoren.</li>
        <li>
          <strong>Betalinger:</strong> type, beløb og dato. Kortoplysninger håndteres alene af Stripe – vi ser dem aldrig.
        </li>
        <li>
          <strong>Tekniske oplysninger:</strong> din IP-adresse bruges kortvarigt (højst 1 time) til at beskytte mod
          misbrug, fx gentagne loginforsøg.
        </li>
      </ul>

      <h2>Formål og retsgrundlag</h2>
      <ul>
        <li>At levere tjenesten, du har bedt om (databeskyttelsesforordningens art. 6, stk. 1, litra b).</li>
        <li>At opfylde bogføringsloven for betalinger (art. 6, stk. 1, litra c).</li>
        <li>At beskytte tjenesten mod misbrug og hacking (art. 6, stk. 1, litra f – vores legitime interesse i sikker drift).</li>
      </ul>
      <p>Vi bruger ikke dine oplysninger til markedsføring, og vi sælger dem ikke.</p>

      <h2>Hvem deler vi oplysninger med?</h2>
      <p>Vi bruger disse databehandlere, som kun må behandle oplysningerne efter vores instruks og under en databehandleraftale:</p>
      <ul>
        <li><strong>{COMPANY.hosting}</strong> – drift af servere og database.</li>
        <li>
          <strong>Anthropic PBC (USA)</strong> – AI-analysen af dit tilbud. Overførslen sker på grundlag af EU-Kommissionens
          standardkontraktbestemmelser og/eller EU-US Data Privacy Framework. Efter Anthropics kommercielle vilkår bruges
          indholdet ikke til at træne deres modeller.
        </li>
        <li><strong>Stripe Payments Europe Ltd.</strong> – betaling (selvstændig dataansvarlig for kortbetalingen).</li>
      </ul>
      <p>
        Når du søger efter håndværkere, slår vi offentlige virksomhedsoplysninger op i CVR-registret (Erhvervsstyrelsen).
        Søgningen indeholder kun fag og postnummer – ikke oplysninger om dig.
      </p>

      <h2>Hvor længe gemmer vi oplysningerne?</h2>
      <ul>
        <li>Konto, tilbud, analyser og beskeder: indtil du sletter dem eller din konto. Sletning sker med det samme.</li>
        <li>Betalingsoplysninger: 5 år efter regnskabsårets udløb (bogføringsloven). Ved sletning af kontoen anonymiseres de.</li>
        <li>Data om loginforsøg: højst 1 time.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Vi bruger kun én cookie, <strong>ff_session</strong>, som holder dig logget ind (udløber efter 30 dage). Den er
        teknisk nødvendig, og derfor kræver den ikke samtykke. Vi bruger ingen statistik-, reklame- eller
        tredjepartscookies, og skrifttyperne hentes fra vores egen server.
      </p>

      <h2>Dine rettigheder</h2>
      <ul>
        <li>Indsigt i dine oplysninger og dataportabilitet – brug <strong>Hent mine data</strong> på din kontoside.</li>
        <li>Berigtigelse af forkerte oplysninger.</li>
        <li>Sletning – brug <strong>Slet min konto</strong> på din kontoside.</li>
        <li>Begrænsning af og indsigelse mod behandlingen.</li>
      </ul>
      <p>
        Skriv til {COMPANY.email}, hvis du vil bruge dine rettigheder eller har spørgsmål. Du kan klage til Datatilsynet,
        Carl Jacobsens Vej 35, 2500 Valby, www.datatilsynet.dk.
      </p>

      <h2>Sikkerhed</h2>
      <p>
        Al trafik er krypteret (HTTPS). Adgangskoder gemmes som hash, filer kontrolleres ved upload og kan kun hentes af
        dig, og der er beskyttelse mod gentagne loginforsøg og forfalskede anmodninger. Opdager vi et sikkerhedsbrud, der
        kan påvirke dig, giver vi dig og Datatilsynet besked efter reglerne.
      </p>
    </LegalPage>
  );
}
