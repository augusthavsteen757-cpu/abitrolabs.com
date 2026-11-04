import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../landing.css";
import { COMPANY, isCompanyConfigured } from "@/lib/company";
import { ORG_DESCRIPTION, organizationJsonLd } from "@/lib/organization";

export const dynamic = "force-dynamic";

const base = () => (process.env.APP_URL || "https://klardal.com").replace(/\/$/, "");

export const metadata: Metadata = {
  // The root layout adds " · Klardal" to other pages; this one is the brand page, so the title stands alone.
  title: { absolute: "Hvad er Klardal? · Om Klardal" },
  description: ORG_DESCRIPTION,
  alternates: { canonical: "/om" },
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
        <p>
          Vi giver små firmaer en online booking, så kunderne selv kan finde en tid. Kunderne får en påmindelse dagen før, og vi
          hjælper jer med at få flere anmeldelser på Google. Har I ikke en hjemmeside, laver vi også den.
        </p>
        <p>I skal ikke give os kodeord. Vi sætter det hele op, og I kan altid ringe, hvis noget skal laves om.</p>

        <h2>Hvad koster det?</h2>
        <p>149 kr. om måneden, hvis I har en hjemmeside. 199 kr. om måneden, hvis vi også laver hjemmesiden. Første måned er gratis, og der er ingen binding.</p>

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
      <footer>
        <div className="wrap">
          <span>Klardal · CVR {COMPANY.cvr}</span>
          <span><a href="/privatlivspolitik">Privatlivspolitik</a></span>
        </div>
      </footer>
    </div>
  );
}
