import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "./landing.css";
import { KlFooter } from "@/components/KlChrome";
import { CallbackForm } from "@/components/CallbackForm";
import { CheckVisual, GoogleVisual, ReportVisual, ReviewVisual } from "@/components/KlVisuals";
import { COMPANY } from "@/lib/company";
import { MISSPELLINGS, organizationJsonLd } from "@/lib/organization";

export const metadata: Metadata = {
  title: { absolute: "Klardal · Hjemmeside og online booking til små firmaer" },
  description: "Flere Google-anmeldelser og en side, der kan findes på Google og i ChatGPT. Gratis tjek, første måned gratis og garanti på 5 nye anmeldelser.",
  alternates: { canonical: "/" },
  // Shared links (Facebook, SMS, Messenger) show the booking offer, not the quote check from the root layout.
  openGraph: {
    type: "website",
    siteName: "Klardal",
    url: "/",
    title: "Når kunderne søger på Google, skal de finde jer",
    description: "Gratis tjek af, hvem Google og ChatGPT anbefaler. Fra 149 kr. om måneden, første måned gratis, og 5 nye Google-anmeldelser eller næste måned gratis.",
  },
  twitter: {
    card: "summary",
    title: "Når kunderne søger på Google, skal de finde jer",
    description: "Gratis tjek af, hvem Google og ChatGPT anbefaler. Fra 149 kr. om måneden, første måned gratis, og 5 nye Google-anmeldelser eller næste måned gratis.",
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
  "Flere anmeldelser på Google",
  "Google og ChatGPT kan læse jeres priser",
  "Online booking og påmindelser",
  "Rapport hver måned",
  "Svar inden for 24 timer på hverdage",
];

export default function Landing() {
  return (
    <div className="kl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()).replace(/</g, "\\u003c") }} />
      <header className="wrap">
        <nav>
          <span className="mark">Klardal</span>
          <a className="navlink" href="#ring">Gratis tjek</a>
        </nav>
      </header>

      <main>
        <div className="wrap hero hero-split">
          <div className="hero-text">
            <h1>Når kunderne søger på Google eller spørger ChatGPT, skal de finde <em>jer.</em></h1>
            <p className="lead">Flere anmeldelser, en side der kan findes, og en kort rapport hver måned.</p>
            <div className="row">
              <a className="btn" href="#ring">Få et gratis tjek</a>
              <span className="fine">Første måned er gratis</span>
            </div>
          </div>
          <GoogleVisual />
        </div>

        <div className="wrap">
          <div className="guarantee" data-testid="garanti">
            <b aria-hidden="true">5</b>
            <p><strong>Vores garanti</strong>5 nye Google-anmeldelser i den gratis måned, ellers er næste måned også gratis. <a href="/vilkaar#garanti">Betingelser</a></p>
          </div>
        </div>

        <div className="wrap steps">
          <h2>Sådan gør vi</h2>
          <ol className="step-grid">
            <li><CheckVisual /><h3><span>1</span>Gratis tjek</h3><p>Vi ser, hvem Google og ChatGPT anbefaler i jeres by.</p></li>
            <li><ReviewVisual /><h3><span>2</span>Flere anmeldelser</h3><p>Vi beder jeres glade kunder om en anmeldelse. I giver os ingen kodeord.</p></li>
            <li><ReportVisual /><h3><span>3</span>Rapport hver måned</h3><p>Anmeldelser, Google og ChatGPT. I kan se, om det virker.</p></li>
          </ol>
        </div>

        <div className="wrap choices">
          <h2>Priser</h2>
          <div className="cards">
            <div className="card">
              <h3>Har I en hjemmeside?</h3>
              <ul>{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="price"><b>149 kr.</b><span>om måneden</span></div>
            </div>
            <div className="card main">
              <h3>Har I ingen hjemmeside?</h3>
              <ul>
                <li data-testid="site-item"><strong>Vi laver en flot hjemmeside til jer</strong></li>
                {ITEMS.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <div className="price"><b>199 kr.</b><span>om måneden, hjemmeside med</span></div>
            </div>
          </div>
          <div className="terms"><span>Ingen kodeord</span><span>Ingen binding</span><span>Første måned gratis</span></div>
        </div>
      </main>

      <section className="close" id="ring">
        <div className="wrap">
          <h2>Se, hvem Google anbefaler <em>i stedet for jer.</em></h2>
          <p className="fine">Skriv jeres nummer, så ringer vi med resultatet. Gratis og uforpligtende.</p>
          <CallbackForm />
          <p className="fine">Vi bruger kun nummeret til at ringe til jer om tjekket.</p>
        </div>
      </section>

      <KlFooter />
    </div>
  );
}
