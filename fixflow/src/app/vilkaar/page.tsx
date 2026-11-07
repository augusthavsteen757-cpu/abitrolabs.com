import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../landing.css";
import { COMPANY } from "@/lib/company";
import { KlFooter, KlHeader } from "@/components/KlChrome";

export const metadata: Metadata = { title: "Vilkår", alternates: { canonical: "/vilkaar" } };
export const dynamic = "force-dynamic";

// UDKAST – skal godkendes af August. Ikke juridisk rådgivning. Aftaler mellem virksomheder (B2B).
export default function TermsPage() {
  return (
    <div className="kl" lang="da">
      <KlHeader />
      <main className="wrap about" data-testid="terms">
        <h1>Vilkår</h1>
        <p className="lead">De korte regler for, hvordan vi arbejder sammen. De gælder for firmaer, der siger ja til Klardal.</p>

        <h2>Parterne</h2>
        <p>{COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address} (Klardal), og det firma, der siger ja (I).</p>

        <h2>Hvad I får</h2>
        <ul>
          <li>Online booking med påmindelse til jeres kunder dagen før.</li>
          <li>Hjælp til flere anmeldelser på Google.</li>
          <li>En hjemmeside, hvis I har valgt pakken til 199 kr.</li>
          <li>Opsætning og hjælp. Ringer eller skriver I, svarer vi inden for 24 timer på hverdage.</li>
        </ul>
        <p>Tilvalg som opslag eller nyhedsbreve aftaler vi pris på, før vi går i gang.</p>

        <h2>Pris og betaling</h2>
        <p>
          Første måned er gratis. Derefter koster det 149 kr. om måneden, eller 199 kr. om måneden med hjemmeside. Klardal er
          ikke momsregistreret, så der lægges ikke moms oven i. Betalingen trækkes automatisk hver måned med betalingskort, MobilePay eller Betalingsservice, som I vælger ved tilmeldingen. Første træk sker, når den gratis måned er gået. Siger I op, stopper trækket ved udgangen af måneden.
        </p>

        <h2 id="garanti">Garanti på anmeldelser</h2>
        <p>
          Har I ikke fået mindst 5 nye anmeldelser på jeres Google-profil, når den gratis måned er gået, er næste måned også
          gratis. Vi tæller de anmeldelser, der er kommet til i den gratis måned, ud fra jeres offentlige Google-profil.
          Garantien kræver, at I har en Google-profil, at vi må bede jeres kunder om en anmeldelse via booking eller
          påmindelser, eller at I selv har vores anmeldelseskort fremme, og at I har haft mindst 20 kunder i måneden.
          Garantien gælder én gang pr. firma. Vi beder kun kunderne om en ærlig anmeldelse og giver aldrig noget til gengæld,
          sådan som Googles regler kræver.
        </p>

        <h2>Opsigelse</h2>
        <p>
          Der er ingen binding. I kan opsige til udgangen af den måned, I er i, ved at ringe eller skrive. Klardal kan opsige
          med 1 måneds varsel.
        </p>

        <h2>Jeres ting er jeres</h2>
        <p>
          Jeres navn, logo, billeder og kundeliste tilhører jer. Stopper I, får I en kopi af kundelisten, og vi sletter den hos
          os senest 30 dage efter. Hjemmeside og booking kører på Klardals konti og lukkes, når aftalen slutter. Har I eget
          domæne, beholder I det.
        </p>

        <h2>Ansvar</h2>
        <p>
          Vi gør vores bedste for, at alt virker, men vi kan ikke love, at booking og hjemmeside aldrig er nede, fx hvis en
          leverandør har fejl. Klardals samlede ansvar er begrænset til det, I har betalt de seneste 3 måneder. Vi er ikke
          ansvarlige for tabt omsætning eller andre indirekte tab.
        </p>

        <h2>Persondata</h2>
        <p>
          Jeres kunders bookinger behandler vi kun på jeres vegne. Det står i{" "}
          <a href="/databehandleraftale">databehandleraftalen</a>. Om jeres egne oplysninger kan I læse i{" "}
          <a href="/privatlivspolitik">privatlivspolitikken</a>.
        </p>

        <h2>Ændringer og lov</h2>
        <p>
          Ændrer vi vilkårene eller prisen, får I besked mindst 1 måned før, så I kan nå at opsige. Dansk ret gælder. Kan vi
          ikke blive enige, afgøres sagen ved retten i Svendborg.
        </p>
      </main>
      <KlFooter />
    </div>
  );
}
