import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../landing.css";
import { COMPANY } from "@/lib/company";
import { CALLBACK_KEEP_DAYS } from "@/lib/callback";
import { OldPrivacy } from "./OldPrivacy";

export const metadata: Metadata = { title: "Privatlivspolitik", alternates: { canonical: "/privatlivspolitik" } };
export const dynamic = "force-dynamic";

// UDKAST – skal godkendes af August. Ikke juridisk rådgivning.
export default function PrivacyPage() {
  if (process.env.OLD_TOOL === "1") return <OldPrivacy />;
  return (
    <div className="kl" lang="da">
      <header className="wrap">
        <nav>
          <a className="mark" href="/" style={{ color: "inherit", textDecoration: "none" }}>Klardal</a>
          <a className="navlink" href="/#ring">Gratis prøve</a>
        </nav>
      </header>
      <main className="wrap about" data-testid="privacy">
        <h1>Privatlivspolitik</h1>
        <p className="lead">Her kan I læse, hvilke oplysninger Klardal gemmer, hvorfor, og hvad I kan gøre ved det.</p>

        <h2>Hvem er ansvarlig?</h2>
        <p>
          {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}. E-mail: {COMPANY.email}.
        </p>

        <h2>Når I beder os ringe</h2>
        <p>
          Skriver I jeres telefonnummer på forsiden, gemmer vi nummeret, firmanavnet (hvis I skriver det) og tidspunktet.
          Vi bruger det kun til at ringe til jer om jeres gratis prøve. Det sker, fordi I selv har bedt om det, før en
          eventuel aftale (databeskyttelsesforordningens art. 6, stk. 1, litra b).
        </p>
        <p>
          Bliver I ikke kunde, sletter vi oplysningerne igen. {`Det sker automatisk senest ${CALLBACK_KEEP_DAYS} dage efter.`}
        </p>

        <h2>Når I er kunde</h2>
        <p>
          Vi gemmer navn, telefon, e-mail og firmaoplysninger for at kunne levere og fakturere. Fakturaer gemmer vi i 5 år
          efter regnskabsårets udløb, fordi bogføringsloven kræver det.
        </p>
        <p>
          Jeres kunders bookinger (navn, telefon, e-mail og tider) behandler vi kun på jeres vegne og efter jeres
          instruks. Det står i den databehandleraftale, vi laver med jer.
        </p>

        <h2>Hvem hjælper os?</h2>
        <ul>
          <li>Render Services, Inc. driver hjemmesiden på en server i Frankfurt (EU). Render er certificeret under EU-US Data Privacy Framework.</li>
          <li>ChiselStrike, Inc. (Turso) opbevarer databasen hos Amazon Web Services i Stockholm (EU), under EU-Kommissionens standardkontraktbestemmelser.</li>
          <li>Brevo (Sendinblue SAS, Frankrig) sender os en e-mail, når I beder os ringe.</li>
        </ul>
        <p>Vi sælger aldrig jeres oplysninger og bruger dem ikke til reklame.</p>

        <h2>Cookies</h2>
        <p>Siden bruger ingen cookies til statistik eller reklame.</p>

        <h2>Det tidligere tilbudsværktøj</h2>
        <p>
          Klardal havde tidligere et værktøj til at tjekke tilbud fra håndværkere. Det er lukket. Havde du en konto, kan du skrive
          til {COMPANY.email}, så sender vi dig dine data eller sletter dem.
        </p>

        <h2>Jeres rettigheder</h2>
        <p>
          I kan få indsigt i jeres oplysninger, få dem rettet eller slettet, og gøre indsigelse. Skriv til {COMPANY.email}.
          I kan klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby, www.datatilsynet.dk.
        </p>
      </main>
      <footer>
        <div className="wrap">
          <span>Klardal · CVR {COMPANY.cvr}</span>
          <span><a href="/om">Om Klardal</a></span>
        </div>
      </footer>
    </div>
  );
}
