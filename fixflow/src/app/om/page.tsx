import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../landing.css";
import { KlFooter } from "@/components/KlChrome";
import { COMPANY, isCompanyConfigured } from "@/lib/company";
import { ORG_DESCRIPTION, organizationJsonLd } from "@/lib/organization";

export const dynamic = "force-dynamic";

const base = () => (process.env.APP_URL || "https://klardal.com").replace(/\/$/, "");

export const metadata: Metadata = {
  // The root layout adds " · Klardal" to other pages; this one is the brand page, so the title stands alone.
  title: { absolute: "Hvad er Klardal? · Om Klardal" },
  description: ORG_DESCRIPTION,
  alternates: { canonical: "/om" },
  openGraph: { type: "website", siteName: "Klardal", url: "/om", title: "Hvad er Klardal?", description: ORG_DESCRIPTION },
  twitter: { card: "summary", title: "Hvad er Klardal?", description: ORG_DESCRIPTION },
};

/** AboutPage + Organization, so a search for "Klardal" can be answered from Klardal's own page. */
function aboutJsonLd() {
  const url = `${base()}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "AboutPage", "@id": `${url}om#page`, url: `${url}om`, name: "Om Klardal", inLanguage: "da", about: { "@id": `${url}#organization` } },
      organizationJsonLd(url),
    ],
  };
}

export default function AboutPage() {
  return (
    <div className="kl" lang="da">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd()).replace(/</g, "\\u003c") }} />
      <header className="wrap">
        <nav>
          <a className="mark" href="/" style={{ color: "inherit", textDecoration: "none" }}>Klardal</a>
          <a className="navlink" href="/#ring">Gratis prøve</a>
        </nav>
      </header>
      <main className="wrap about">
        <h1>Hvad er Klardal?</h1>
        <p className="lead" data-testid="about-lead">{ORG_DESCRIPTION}</p>

        <h2>Hvad vi laver</h2>
        <ul>
          <li>Hjemmeside, hvis I ikke har en</li>
          <li>Online booking, så kunderne selv kan finde en tid</li>
          <li>En påmindelse til kunderne dagen før</li>
          <li>Flere anmeldelser på Google</li>
        </ul>
        <p>Det kan I også få lagt til:</p>
        <ul>
          <li>Vi svarer på jeres anmeldelser</li>
          <li>Opslag til Facebook og Instagram</li>
          <li>Nyhedsbreve og tilbud til jeres faste kunder</li>
          <li>En SMS, der får kunder til at komme igen</li>
        </ul>
        <p>I skal ikke give os kodeord. Vi sætter det hele op. Driller noget, så ring eller skriv, så svarer vi inden for 24 timer på hverdage og retter det.</p>

        <h2>Hvad koster det?</h2>
        <p>149 kr. om måneden, hvis I har en hjemmeside. 199 kr. om måneden, hvis vi også laver hjemmesiden. Første måned er gratis, og der er ingen binding. Tilvalg aftaler vi pris på, før vi går i gang.</p>

        <h2>Hvem står bag?</h2>
        <p>
          Klardal er startet i 2026 og drives fra Svendborg
          {isCompanyConfigured() ? ` af ${COMPANY.name}, CVR ${COMPANY.cvr}` : ""}.
        </p>

        <h2>Kontakt</h2>
        <p>
          Skriv til <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, eller{" "}
          <a href="/#ring">skriv jeres nummer på forsiden</a>, så ringer vi.
        </p>
      </main>
      <KlFooter />
    </div>
  );
}
