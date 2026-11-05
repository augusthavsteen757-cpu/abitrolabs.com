import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../landing.css";
import { COMPANY } from "@/lib/company";
import { KlFooter, KlHeader } from "@/components/KlChrome";

export const metadata: Metadata = { title: "Databehandleraftale", alternates: { canonical: "/databehandleraftale" } };
export const dynamic = "force-dynamic";

// UDKAST – skal godkendes af August. Ikke juridisk rådgivning. Datatilsynet har en officiel skabelon på datatilsynet.dk.
export default function DpaPage() {
  return (
    <div className="kl" lang="da">
      <KlHeader />
      <main className="wrap about" data-testid="dpa">
        <h1>Databehandleraftale</h1>
        <p className="lead">
          Når I siger ja til Klardal, gælder denne aftale. Den sikrer, at vi kun bruger jeres kunders oplysninger til det, I
          har bedt om.
        </p>

        <h2>Parterne</h2>
        <p>
          <strong>Dataansvarlig:</strong> det firma, der siger ja (I).<br />
          <strong>Databehandler:</strong> {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}.
        </p>

        <h2>1. Hvad aftalen handler om</h2>
        <p>Klardal driver online booking, påmindelser, anmeldelses-beskeder og evt. hjemmeside for jer.</p>

        <h2>2. Hvilke oplysninger</h2>
        <p>Navn, telefonnummer, e-mail og bookingtider for jeres kunder.</p>

        <h2>3. Hvad Klardal må</h2>
        <ul>
          <li>Kun bruge oplysningerne til booking, påmindelser og anmeldelses-beskeder for jer, efter jeres instruks.</li>
          <li>Ikke sælge, dele eller bruge oplysningerne til andet.</li>
          <li>Holde oplysningerne fortrolige og beskytte dem med stærke kodeord og to-trins-login.</li>
          <li>Hjælpe jer, hvis en af jeres kunder beder om indsigt i eller sletning af sine oplysninger.</li>
        </ul>

        <h2>4. Underdatabehandlere</h2>
        <p>
          I godkender, at Klardal bruger SimplyBook.me (booking og påmindelser) og Render (hjemmeside, server i EU). Vi giver
          jer besked, før vi tager nye i brug, så I kan sige nej.
        </p>

        <h2>5. Brud på sikkerheden</h2>
        <p>Klardal giver jer besked hurtigst muligt og senest inden 24 timer, hvis oplysninger går tabt eller bliver set af uvedkommende.</p>

        <h2>6. Når aftalen slutter</h2>
        <p>Klardal sender jer en kopi af kundelisten og sletter den derefter senest 30 dage efter.</p>

        <p className="hint">
          Aftalen gælder fra den dag, I trykker &quot;Send ja&quot;. Vi gemmer jeres ja sammen med dato og tidspunkt.
        </p>
      </main>
      <KlFooter />
    </div>
  );
}
