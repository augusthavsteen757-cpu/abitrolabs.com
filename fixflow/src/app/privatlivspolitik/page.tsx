import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Privatlivspolitik" };
export const dynamic = "force-dynamic";

const TRANSFER =
  "Overførslen sker på grundlag af EU-Kommissionens standardkontraktbestemmelser og – hvis udbyderen er certificeret – EU-US Data Privacy Framework.";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privatlivspolitik">
      <p>
        Her kan du læse, hvilke oplysninger Budsyn behandler om dig, hvorfor, og hvilke rettigheder du har. Vi indsamler
        kun det, der er nødvendigt for at levere tjenesten.
      </p>

      <h2>Dataansvarlig</h2>
      <p>
        {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}. E-mail: {COMPANY.email}. Telefon: {COMPANY.phone}.
      </p>

      <h2>Hvilke oplysninger behandler vi?</h2>
      <ul>
        <li><strong>Konto:</strong> navn, e-mail og din adgangskode (gemt som et bcrypt-hash – vi kan ikke se den).</li>
        <li>
          <strong>Postnummer</strong>, hvis du angiver det eller søger på det under Find håndværkere. Det gemmes på din
          profil, så vi kan vise afstande.
        </li>
        <li>
          <strong>Tilbud du uploader</strong> og analysen af dem. Et tilbud kan indeholde dit navn og din adresse samt
          håndværkerens oplysninger. Upload kun tilbud, du selv har modtaget, og overstreg gerne CPR-nummer og andre
          følsomme oplysninger først.
        </li>
        <li><strong>Beskeder</strong>, du laver med beskedgeneratoren (udkastet indeholder dit navn).</li>
        <li>
          <strong>Køb:</strong> type, beløb, dato, dit samtykke til levering med det samme og evt. fortrydelse.
          Kortoplysninger håndteres alene af Stripe – vi ser dem aldrig.
        </li>
        <li>
          <strong>Tekniske oplysninger:</strong> din IP-adresse og, ved loginforsøg, den indtastede e-mail gemmes i højst
          1 time for at beskytte mod misbrug. Vores hostingudbyder fører tekniske logfiler med IP-adresser i en kort
          periode. Vi registrerer også, hvornår du sidst har været aktiv (bruges til at slette inaktive konti).
        </li>
      </ul>

      <h2>Formål og retsgrundlag</h2>
      <ul>
        <li>At levere tjenesten, du har bedt om (databeskyttelsesforordningens art. 6, stk. 1, litra b).</li>
        <li>At opfylde bogføringsloven og forbrugeraftaleloven for køb (art. 6, stk. 1, litra c).</li>
        <li>At beskytte tjenesten mod misbrug og hacking (art. 6, stk. 1, litra f – vores legitime interesse i sikker drift).</li>
      </ul>
      <p>Vi bruger ikke dine oplysninger til markedsføring, og vi sælger dem ikke.</p>

      <h2>Oplysninger om andre end dig</h2>
      <p>
        Tilbud og søgeresultater indeholder oplysninger om håndværkere (navn, adresse, telefon, CVR). For
        enkeltmandsvirksomheder er det personoplysninger. Vi behandler dem kun for at vise dig analysen og søgeresultatet,
        på grundlag af legitim interesse (art. 6, stk. 1, litra f), og sletter dem sammen med dit tilbud eller din konto.
        Søgeresultater kommer fra det offentlige CVR-register; firmaer med reklamebeskyttelse vises ikke.
      </p>

      <h2>Hvem deler vi oplysninger med?</h2>
      <p>Vi bruger disse databehandlere, som kun må behandle oplysningerne efter vores instruks og under en databehandleraftale:</p>
      <ul>
        <li>
          <strong>Render Services, Inc. (USA)</strong> – drift af serveren, der står i Frankfurt (EU). {TRANSFER}
        </li>
        <li>
          <strong>ChiselStrike, Inc. (Turso, USA)</strong> – database med din konto, dine analyser og dine uploadede filer,
          opbevaret hos Amazon Web Services i Stockholm (EU). {TRANSFER}
        </li>
        <li>
          <strong>Anthropic (USA)</strong> – AI-analyse af dine tilbud og udkast til beskeder. {TRANSFER} Efter
          Anthropics kommercielle vilkår bruges indholdet ikke til at træne deres modeller, og det gemmes kun i en
          begrænset periode.
        </li>
        <li>
          <strong>Brevo (Sendinblue SAS, Frankrig)</strong> – afsendelse af ordrebekræftelser og andre e-mails om din
          konto.
        </li>
      </ul>
      <p>
        <strong>Stripe Payments Europe Ltd. (Irland)</strong> er selvstændig dataansvarlig for kortbetalingen og opbevarer
        oplysningerne efter egne regler – også hvis du sletter din konto hos os.
      </p>
      <p>
        Når du søger efter håndværkere, slår vi offentlige virksomhedsoplysninger op i CVR-registret (Erhvervsstyrelsen).
        Søgningen indeholder kun fag og postnummer – ikke oplysninger om dig.
      </p>

      <h2>Hvor længe gemmer vi oplysningerne?</h2>
      <ul>
        <li>
          Konto, tilbud, analyser og beskeder: indtil du sletter dem eller din konto. Vi sletter straks i databasen; kopier
          i databasens sikkerhedskopier slettes automatisk, når de udløber.
        </li>
        <li>Konti, der ikke har været brugt i 3 år, sletter vi automatisk.</li>
        <li>
          Køb: 5 år efter regnskabsårets udløb (bogføringsloven). Sletter du din konto, gemmes de uden navn og e-mail.
        </li>
        <li>IP-adresse og e-mail ved loginforsøg: højst 1 time.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Vi bruger to nødvendige cookies: <strong>ff_session</strong> holder dig logget ind (30 dage), og{" "}
        <strong>ff_lang</strong> husker dit valgte sprog (12 måneder, kun hvis du vælger et sprog). De er nødvendige for
        at levere den tjeneste, du har bedt om, og kræver derfor ikke samtykke. Vi bruger ingen statistik-, reklame- eller
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
