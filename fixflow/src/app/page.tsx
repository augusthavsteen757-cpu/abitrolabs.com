import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "./landing.css";
import { KlFooter } from "@/components/KlChrome";
import { CallbackForm } from "@/components/CallbackForm";
import { COMPANY } from "@/lib/company";
import { MISSPELLINGS, organizationJsonLd } from "@/lib/organization";

export const metadata: Metadata = {
  title: { absolute: "Klardal · Hjemmeside og online booking til små firmaer" },
  description: "Når kunder spørger ChatGPT eller Google efter et firma i byen, skal de finde jer. Vi gør små firmaer lette at finde, måler det hver måned og skaffer flere Google-anmeldelser. Første måned er gratis.",
  alternates: { canonical: "/" },
  // Shared links (Facebook, SMS, Messenger) show the booking offer, not the quote check from the root layout.
  openGraph: {
    type: "website",
    siteName: "Klardal",
    url: "/",
    title: "Når kunderne spørger ChatGPT, skal de finde jer",
    description: "Gratis AI-tjek af jeres firma. Fra 149 kr. om måneden, første måned gratis, og 5 nye Google-anmeldelser eller næste måned gratis.",
  },
  twitter: {
    card: "summary",
    title: "Når kunderne spørger ChatGPT, skal de finde jer",
    description: "Gratis AI-tjek af jeres firma. Fra 149 kr. om måneden, første måned gratis, og 5 nye Google-anmeldelser eller næste måned gratis.",
  },
};

/** WebSite + Organization: gives Google the site name and the logo it shows next to search results. */
function siteJsonLd() {
  const url = `${(process.env.APP_URL || "https://klardal.com").replace(/\/$/, "")}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}#website`, name: "Klardal", alternateName: ["klardal.com", ...MISSPELLINGS], url, publisher: { "@id": `${url}#organization` } },
      organizationJsonLd(url),
    ],
  };
}

export const dynamic = "force-dynamic";

const ITEMS = [
  "ChatGPT og Google kan læse jeres priser og ydelser",
  "Månedlig rapport: hvad svarer AI'erne om jer?",
  "Flere anmeldelser på Google",
  "Online booking og påmindelser",
  "Svar inden for 24 timer på hverdage",
];

export default function Landing() {
  return (
    <div className="kl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()).replace(/</g, "\\u003c") }} />
      <header className="wrap">
        <nav>
          <span className="mark">Klardal</span>
          <a className="navlink" href="#ring">Gratis AI-tjek</a>
        </nav>
      </header>

      <main>
        <div className="wrap hero">
          <h1>Når kunderne spørger ChatGPT, skal de finde <em>jer.</em></h1>
          <p className="lead">Vi gør jer lette at finde og viser jer hver måned, hvad der sker.</p>
          <div className="row">
            <a className="btn" href="#ring">Få et gratis AI-tjek</a>
            <span className="fine">Første måned er gratis</span>
          </div>
        </div>

        <div className="wrap choices" data-testid="garanti">
          <h2>Vores garanti</h2>
          <p className="lead">5 nye Google-anmeldelser i den gratis måned, ellers er næste måned også gratis. <a href="/vilkaar#garanti">Betingelser</a></p>
        </div>

        <div className="wrap choices">
          <h2>Priser</h2>
          <div className="cards">
            <div className="card">
              <h3>Har I allerede en hjemmeside?</h3>
              <ul>{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="price"><b>149 kr.</b><span>om måneden</span></div>
            </div>
            <div className="card main">
              <h3>Har I ikke en hjemmeside?</h3>
              <ul>
                <li data-testid="site-item"><strong>Vi laver en flot hjemmeside til jer</strong></li>
                {ITEMS.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <div className="price"><b>199 kr.</b><span>om måneden, hjemmeside med</span></div>
            </div>
          </div>
          <div className="terms"><span>I skal ikke give os kodeord</span><span>Ingen binding</span><span>Første måned gratis</span></div>
        </div>
      </main>

      <section className="close" id="ring">
        <div className="wrap">
          <h2>Se, hvem ChatGPT anbefaler <em>i stedet for jer.</em></h2>
          <p className="fine">Skriv jeres nummer, så ringer vi med resultatet. Gratis og uforpligtende.</p>
          <CallbackForm />
          <p className="fine">Vi bruger kun nummeret til at ringe til jer om tjekket.</p>
        </div>
      </section>

      <KlFooter />
    </div>
  );
}
