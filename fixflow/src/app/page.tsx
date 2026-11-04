import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "./landing.css";
import { CallbackForm } from "@/components/CallbackForm";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: { absolute: "Klardal · Hjemmeside og online booking til små firmaer" },
  description: "Vi sætter hjemmeside, online booking og Google-anmeldelser op for små firmaer og holder det kørende. Første måned er gratis.",
  alternates: { canonical: "/" },
  // Shared links (Facebook, SMS, Messenger) show the booking offer, not the quote check from the root layout.
  openGraph: {
    type: "website",
    siteName: "Klardal",
    url: "/",
    title: "Pas jeres firma. Vi passer resten.",
    description: "Hjemmeside, online booking og Google-anmeldelser til små firmaer. Fra 149 kr. om måneden, første måned gratis.",
  },
  twitter: {
    card: "summary",
    title: "Pas jeres firma. Vi passer resten.",
    description: "Hjemmeside, online booking og Google-anmeldelser til små firmaer. Fra 149 kr. om måneden, første måned gratis.",
  },
};

const ITEMS = [
  "Kunder kan booke eller skrive til jer døgnet rundt",
  "Automatiske beskeder til jeres kunder",
  "Flere anmeldelser på Google",
  "Vi sætter det hele op",
  "Hjælp, når I vil ændre noget",
];

export default function Landing() {
  return (
    <div className="kl">
      <header className="wrap">
        <nav>
          <span className="mark">Klardal</span>
          <a className="navlink" href="#ring">Gratis prøve</a>
        </nav>
      </header>

      <main>
        <div className="wrap hero">
          <h1>Pas jeres firma. Vi passer <em>resten.</em></h1>
          <p className="lead">
            Hjemmeside, booking og Google-anmeldelser tager tid, som I ikke har. Vi sætter det op og holder det kørende, så nye
            kunder kan finde jer og komme i kontakt med jer, også når I har lukket.
          </p>
          <div className="row">
            <a className="btn" href="#ring">Få en gratis prøve</a>
            <span className="fine">Første måned er gratis</span>
          </div>
        </div>

        <div className="wrap choices">
          <h2>Samme pakke. To priser.</h2>
          <div className="cards">
            <div className="card">
              <h3>I har en hjemmeside</h3>
              <ul>{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="price"><b>149 kr.</b><span>om måneden</span></div>
            </div>
            <div className="card main">
              <h3>I har ingen hjemmeside</h3>
              <ul>{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="price"><b>199 kr.</b><span>om måneden, hjemmeside med</span></div>
            </div>
          </div>
          <div className="terms"><span>I skal ikke give os kodeord</span><span>Ingen binding</span><span>Første måned gratis</span></div>
        </div>
      </main>

      <section className="close" id="ring">
        <div className="wrap">
          <h2>Se jeres nye side, før I betaler <em>en krone.</em></h2>
          <p className="fine">Skriv jeres nummer. Vi laver en gratis prøveversion til jer og ringer, når den er klar. Kan I ikke lide den, har det ikke kostet jer noget.</p>
          <CallbackForm />
          <p className="fine">Vi bruger kun nummeret til at ringe til jer om prøven.</p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>Klardal · CVR {COMPANY.cvr}</span>
          <span><a href="/privatlivspolitik">Privatlivspolitik</a></span>
        </div>
      </footer>
    </div>
  );
}
