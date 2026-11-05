import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../../landing.css";
import { aabningTekst, firmaJsonLd, ydelseTekst } from "@/lib/firma-profil";
import { kundeOf, kundeUrl } from "@/lib/kunder";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = kundeOf(slug);
  if (!p) return { title: "Ikke fundet" };
  return {
    title: { absolute: `${p.navn} · ${p.branche} i ${p.adresse.by}` },
    description: p.beskrivelse,
    alternates: { canonical: p.hjemmeside ?? `/firma/${slug}`, types: { "text/markdown": `/firma/${slug}/llms.txt` } },
    robots: p.eksempel ? { index: false, follow: false } : undefined,
  };
}

/** A customer's public profile: readable for people, and for search engines and AI assistants via JSON-LD + llms.txt. */
export default async function FirmaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = kundeOf(slug);
  if (!p) notFound();
  const json = JSON.stringify(firmaJsonLd(p, kundeUrl(slug))).replace(/</g, "\\u003c");
  return (
    <div className="kl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      {p.eksempel && <p className="fine" data-testid="eksempel" style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--line)" }}>Eksempel på en firmaprofil fra Klardal. Firmaet findes ikke.</p>}
      <header className="wrap"><nav><span className="mark">{p.navn}</span>{(p.telefon || p.bookingUrl) && <a className="navlink" href="#kontakt">Kontakt</a>}</nav></header>
      <main>
        <div className="wrap hero" style={{ paddingBlock: "48px 56px" }}>
          <h1 style={{ fontSize: "clamp(2.4rem,7vw,4.2rem)" }}>{p.branche} i <em>{p.adresse.by}</em></h1>
          <p className="lead">{p.beskrivelse}</p>
          {p.omraade?.length ? <p className="fine">Vi arbejder i {p.omraade.join(", ")}.</p> : null}
        </div>
        <div className="wrap choices" style={{ paddingBottom: 64 }}>
          <div className="cards">
            <div className="card">
              <h3>Ydelser og priser</h3>
              <ul data-testid="ydelser">{p.ydelser.map((y) => <li key={y.navn}>{ydelseTekst(y)}</li>)}</ul>
              {p.ydelser.some((y) => y.pris !== undefined) && <p className="fine">Priser er inkl. moms.</p>}
            </div>
            <div className="card" id="kontakt">
              <h3>Åbningstider og kontakt</h3>
              <ul>
                {p.aabning.map((a) => <li key={a.dage.join()}>{aabningTekst(a)}</li>)}
                {(p.efterAftale || !p.aabning.length) && <li>Efter aftale</li>}
                <li>{p.adresse.gade}, {p.adresse.postnr} {p.adresse.by}</li>
                {p.telefon && <li><a href={`tel:${p.telefon.replace(/\s/g, "")}`}>{p.telefon}</a></li>}
                {p.email && <li><a href={`mailto:${p.email}`}>{p.email}</a></li>}
              </ul>
              {p.bookingUrl && !p.eksempel && <a className="btn" href={p.bookingUrl}>Book en tid</a>}
            </div>
          </div>
        </div>
      </main>
      <footer><div className="wrap"><span>{p.navn}{p.cvr ? ` · CVR ${p.cvr}` : ""}</span><span>Side lavet af <a href="/">Klardal</a></span></div></footer>
    </div>
  );
}
