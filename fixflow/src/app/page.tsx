import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { PricingCards } from "@/components/PricingCards";
import { isBeta } from "@/lib/plans";
import { Faq } from "@/components/Faq";
import { ScoreRing } from "@/components/ScoreRing";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import type { Dict } from "@/i18n/dict";

export const dynamic = "force-dynamic";

// Tells Google the site name and logo shown next to search results (static values only – no user input).
function siteJsonLd() {
  const url = `${(process.env.APP_URL || "https://klardal.com").replace(/\/$/, "")}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}#website`, name: "Klardal", alternateName: "klardal.com", url },
      { "@type": "Organization", "@id": `${url}#organization`, name: "Klardal", url, logo: `${url}logo.png` },
    ],
  };
}

function HeroMock({ d }: { d: Dict }) {
  const m = d.home.mock;
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500"];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="card relative z-10 p-5 shadow-lift sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">
              {m.firm} · <span className="italic">{m.example}</span>
            </p>
            <p className="truncate font-display text-lg font-semibold">{m.job}</p>
          </div>
          <span className="badge shrink-0 bg-amber-50 text-amber-800 ring-1 ring-amber-200">{m.priceType}</span>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <ScoreRing score={36} size={104} label={m.scoreLabel} />
          <div className="min-w-0 space-y-2 text-sm">
            <div>
              <p className="text-ink-muted">{m.price}</p>
              <p className="num font-display text-xl font-semibold">160.500 kr.</p>
            </div>
            <div>
              <p className="text-ink-muted">{m.extra}</p>
              <p className="num font-semibold text-red-700">10.000–36.250 kr.</p>
            </div>
          </div>
        </div>
        <ul className="mt-5 space-y-2">
          {m.flags.map((t, i) => (
            <li key={t} className="flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2.5 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${colors[i % colors.length]}`} />
              <span className="min-w-0 truncate">{t}</span>
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
  const d = await getDict();
  const h = d.home;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }} />
      <MarketingHeader loggedIn={!!user} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
            <div>
              <p className="eyebrow">{h.eyebrow}</p>
              <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.08] sm:text-5xl lg:text-[3.6rem]">{h.title}</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">{h.lead}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={user ? "/dashboard/upload" : "/opret"} className="btn-primary px-6 py-3 text-base">
                  {h.ctaPrimary} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/#saadan" className="btn-secondary hidden px-6 py-3 text-base sm:inline-flex">
                  {h.ctaSecondary}
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
                <ShieldCheck className="h-4 w-4 text-brand-600" /> {h.reassurance}
              </p>
            </div>
            <HeroMock d={d} />
          </div>
        </section>

        {/* How it works */}
        <section id="saadan" className="scroll-mt-20 border-t border-line bg-white">
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
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {h.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href={user ? "/dashboard/upload" : "/opret"} className="btn-primary mt-8 px-6 py-3 text-base">
              {h.readyCta} <ArrowRight className="h-4 w-4" />
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
