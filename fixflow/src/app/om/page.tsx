import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Languages } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
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

export default async function AboutPage() {
  const [{ locale, d }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const cta = user ? "/dashboard/upload" : "/opret";
  return (
    <>
      <MarketingHeader loggedIn={!!user} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd()).replace(/</g, "\\u003c") }} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        {locale !== "da" && (
          <p lang={locale} className="mb-6 flex gap-2 rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">
            <Languages className="mt-0.5 h-4 w-4 shrink-0" /> {d.article.danishOnly}
          </p>
        )}
        <article lang="da" className="text-ink-soft [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_p]:mt-3 [&_p]:leading-relaxed">
          <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-5xl">Hvad er Klardal?</h1>
          <p className="!mt-6 text-lg" data-testid="about-lead">{ORG_DESCRIPTION}</p>

          <h2>Sådan virker det</h2>
          <p>
            Du uploader et håndværkertilbud som PDF eller foto. Klardal læser tilbuddet med kunstig intelligens (AI) og
            viser på almindeligt dansk, om prisen er fast eller et overslag, hvilke poster der er uklare, hvad der mangler,
            og hvilke spørgsmål du kan stille, før du skriver under. Du kan også sammenligne flere tilbud.
          </p>
          <p>Analysen er et skøn og en hjælp. Den erstatter ikke juridisk eller teknisk rådgivning, så tjek altid det originale tilbud.</p>

          <h2>Hvem står bag?</h2>
          <p>
            Klardal er startet i 2026 og drives fra Svendborg
            {isCompanyConfigured() ? ` af ${COMPANY.name}, CVR ${COMPANY.cvr}` : ""}.
          </p>

          <h2>Det er Klardal ikke</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>Ikke en håndværkerformidler. Klardal sælger ikke håndværkerydelser.</li>
            <li>Klardal får ikke betaling fra håndværkere.</li>
            <li>Ikke part i aftalen mellem dig og håndværkeren.</li>
          </ul>

          <h2>Kontakt</h2>
          <p>
            Skriv til <a href={`mailto:${COMPANY.email}`} className="underline hover:text-ink">{COMPANY.email}</a>.
          </p>
        </article>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href={cta} className="btn-primary px-6 py-3 text-base">
            {d.home.ctaPrimary} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/artikler" className="btn-secondary px-6 py-3 text-base">{d.article.indexTitle}</Link>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
