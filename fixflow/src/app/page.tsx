import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  TriangleAlert,
  ListChecks,
  MessageSquareText,
  Columns3,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { PricingCards } from "@/components/PricingCards";
import { betaEndText, isBeta } from "@/lib/plans";
import { Faq } from "@/components/Faq";
import { ScoreRing } from "@/components/ScoreRing";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { INTL_LOCALE } from "@/i18n/config";
import { fmt } from "@/i18n/fmt";
import type { Dict } from "@/i18n/dict";
import { MISSPELLINGS, organizationJsonLd } from "@/lib/organization";

// Words in Danish quotes that can make the bill bigger. Kept in Danish in every language: it is what the quote says.
const SMALL_PRINT = ["»efter regning«", "»ca.«", "»diverse«", "»ekskl. materialer«", "»forbehold for skjulte skader«"];

// Same order as home.features in the dictionaries.
const FEATURE_ICONS = [Gauge, TriangleAlert, ListChecks, MessageSquareText, Columns3];

export const dynamic = "force-dynamic";

// Each public page names its own canonical URL (the root layout does not set one, or every page would point here).
export const metadata: Metadata = { alternates: { canonical: "/" } };

// Tells Google the site name, logo and what Klardal is (static values only – no user input).
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

function HeroMock({ d }: { d: Dict }) {
  const m = d.home.mock;
  // Same example as the video ad (a 54,000 kr. quote that ended at 72,000 kr.), so people who click recognise it.
  const tagColors = ["bg-red-50 text-red-700 ring-red-200", "bg-red-50 text-red-700 ring-red-200", "bg-amber-50 text-amber-800 ring-amber-200"];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <p className="mb-3 text-center text-sm font-medium text-ink-muted lg:text-left">{m.exampleTitle}</p>
      <div className="card relative z-10 p-5 shadow-lift sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">
              {m.firm} · <span className="italic">{m.example}</span>
            </p>
            <p className="font-display text-lg font-semibold leading-snug">{m.job}</p>
          </div>
          <span className="badge shrink-0 bg-amber-50 text-amber-800 ring-1 ring-amber-200">{m.priceType}</span>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <ScoreRing score={36} size={104} label={d.score.labels.veryUnclear} />
          <div className="min-w-0 space-y-2 text-sm">
            <div>
              <p className="text-ink-muted">{m.price}</p>
              <p className="num font-display text-xl font-semibold">54.000 kr.</p>
            </div>
            <div>
              <p className="text-ink-muted">{m.extra}</p>
              <p className="num font-semibold text-red-700">5.000–18.000 kr.</p>
            </div>
          </div>
        </div>
        <ul className="mt-5 space-y-2">
          {m.flags.map((t, i) => (
            <li key={t} className="flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2.5 text-sm">
              <span className={`badge shrink-0 ring-1 ${tagColors[i % tagColors.length]}`}>{m.tags[i]}</span>
              <span className="min-w-0 sm:truncate">{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-6 right-2 z-20 hidden w-56 animate-float sm:block rounded-2xl border border-line bg-white p-4 shadow-lift sm:-right-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          <CheckCircle2 className="h-4 w-4" /> {m.messageReady}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{m.message}</p>
      </div>
      <div className="absolute -left-6 -top-6 -z-0 h-40 w-40 rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
    </div>
  );
}


export default async function HomePage() {
  const user = await getCurrentUser();
  const { locale, d } = await getI18n();
  const h = d.home;
  // "Gratis" only while everything is free; afterwards only the score is free (see forbrugerombudsmanden-tjek.md).
  const beta = isBeta();
  const cta = beta ? h.ctaPrimary : h.ctaAfterBeta;
  const reassurance = beta ? fmt(h.reassurance, { date: betaEndText(INTL_LOCALE[locale]) }) : h.reassuranceAfterBeta;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }} />
      <MarketingHeader loggedIn={!!user} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
            <div className="min-w-0">
              <p className="mb-3 font-semibold text-red-700">{h.kicker}</p>
              <h1 className="text-[2.1rem] font-semibold leading-[1.08] sm:text-5xl lg:text-[3.3rem]">{h.title}</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">{h.lead}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={user ? "/dashboard/upload" : "/opret"} className="btn-primary px-6 py-3 text-base">
                  {cta} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/#saadan" className="btn-secondary hidden px-6 py-3 text-base sm:inline-flex">
                  {h.ctaSecondary}
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
                <ShieldCheck className="h-4 w-4 text-brand-600" /> {reassurance}
              </p>
            </div>
            <HeroMock d={d} />
          </div>
        </section>

        {/* The small print – the same point as the ads: the explanation was in the quote all along */}
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="font-medium">{h.smallPrintTitle}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SMALL_PRINT.map((w) => (
                <li key={w} className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-200">{w}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="saadan" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-semibold sm:text-4xl">{h.howTitle}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {h.steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-sans text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1 text-ink-soft">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What you get */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-semibold sm:text-4xl">{h.whyTitle}</h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-soft">{h.whyText}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {h.features.map((f, i) => {
                const Icon = FEATURE_ICONS[i] ?? CheckCircle2;
                return (
                  <li key={f.title} className="card flex gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-sans text-base font-semibold">{f.title}</h3>
                      <p className="mt-1 text-ink-soft">{f.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href={user ? "/dashboard/upload" : "/opret"} className="btn-primary mt-8 px-6 py-3 text-base">
              {cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Pricing – in the beta the notice says it all */}
        <section id="priser" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            {!isBeta() && (
              <div className="mb-8 max-w-2xl">
                <h2 className="text-2xl font-semibold sm:text-4xl">{h.pricingTitle}</h2>
                <p className="mt-3 text-lg text-ink-soft">{h.pricingText}</p>
              </div>
            )}
            <PricingCards />
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-white/60">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-semibold sm:text-4xl">{h.faqTitle}</h2>
            <div className="mt-6">
              <Faq />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
