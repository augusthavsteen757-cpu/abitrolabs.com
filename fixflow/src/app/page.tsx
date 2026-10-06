import Link from "next/link";
import {
  ArrowRight,
  FileUp,
  ScanSearch,
  MessageSquareText,
  Gauge,
  AlertTriangle,
  BookOpenText,
  ListChecks,
  HelpCircle,
  Send,
  Columns3,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { PricingCards } from "@/components/PricingCards";
import { Faq } from "@/components/Faq";
import { ScoreRing } from "@/components/ScoreRing";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function HeroMock() {
  const flags = [
    { t: "El-arbejde afregnes efter forbrug", c: "bg-red-500" },
    { t: "Materialer for 32.000 kr. uden specifikation", c: "bg-red-500" },
    { t: "Bortskaffelse af affald er ikke nævnt", c: "bg-amber-500" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="card relative z-10 p-5 shadow-lift sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Hansen & Søn VVS-Byg ApS</p>
            <p className="truncate font-display text-lg font-semibold">Renovering af badeværelse</p>
          </div>
          <span className="badge shrink-0 bg-amber-50 text-amber-800 ring-1 ring-amber-200">Overslag</span>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <ScoreRing score={36} size={104} label="Meget uklart" />
          <div className="min-w-0 space-y-2 text-sm">
            <div>
              <p className="text-ink-muted">Pris inkl. moms</p>
              <p className="num font-display text-xl font-semibold">160.500 kr.</p>
            </div>
            <div>
              <p className="text-ink-muted">Mulige ekstraudgifter</p>
              <p className="num font-semibold text-red-700">10.000–36.250 kr.</p>
            </div>
          </div>
        </div>
        <ul className="mt-5 space-y-2">
          {flags.map((f) => (
            <li key={f.t} className="flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2.5 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${f.c}`} />
              <span className="min-w-0 truncate">{f.t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-6 right-2 z-20 w-56 animate-float rounded-2xl border border-line bg-white p-4 shadow-lift sm:-right-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          <CheckCircle2 className="h-4 w-4" /> Besked klar
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          “Hej Hansen & Søn. Tak for jeres tilbud. Kan I sende en liste over, hvad materialerne til 32.000 kr. dækker?”
        </p>
      </div>
      <div className="absolute -left-6 -top-6 -z-0 h-40 w-40 rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
    </div>
  );
}

const STEPS = [
  { icon: FileUp, title: "Upload tilbuddet", text: "Træk en PDF ind eller tag et billede med mobilen. Det tager under et minut." },
  { icon: ScanSearch, title: "Vi gennemgår det", text: "Hver post forklares, uklare punkter markeres, og du får en Tilbudsscore fra 0 til 100." },
  { icon: MessageSquareText, title: "Stil de rigtige spørgsmål", text: "Få konkrete spørgsmål og en færdig besked, du kan sende til håndværkeren." },
];

const FEATURES = [
  { icon: Gauge, title: "Tilbudsscore", text: "Én tal fra 0–100, der viser hvor gennemsigtigt tilbuddet er – beregnet efter faste regler." },
  { icon: AlertTriangle, title: "Skjulte udgifter", text: "Vi finder “efter regning”, “diverse” og manglende poster, der kan blive til ekstraregninger." },
  { icon: BookOpenText, title: "Almindeligt dansk", text: "Hver post forklaret, så du ved, hvad du faktisk betaler for." },
  { icon: ListChecks, title: "10-punkts tjekliste", text: "CVR, betalingsplan, garanti, tidsplan og mere – står det i tilbuddet?" },
  { icon: HelpCircle, title: "Spørgsmål til håndværkeren", text: "Konkrete og høflige spørgsmål, der henviser til de rigtige poster og beløb." },
  { icon: Send, title: "Færdige beskeder", text: "Vælg emne og tone – venlig, neutral eller bestemt – og send." },
  { icon: Columns3, title: "Sammenlign tilbud", text: "Se op til 4 tilbud side om side: pris, værste scenarie og hvad der mangler hvor." },
];

const STATS = [
  { value: "10", label: "vigtige punkter tjekkes i hvert tilbud" },
  { value: "0–100", label: "Tilbudsscore efter faste, ens regler" },
  { value: "< 2 min.", label: "fra upload til færdig analyse" },
  { value: "4", label: "tilbud kan sammenlignes side om side" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <>
      <MarketingHeader loggedIn={!!user} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
            <div>
              <p className="eyebrow">Til boligejere</p>
              <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1.05] sm:text-5xl lg:text-[3.6rem]">
                Forstå dit håndværkertilbud — før du skriver under.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                Upload tilbuddet, og få det forklaret på almindeligt dansk. Vi viser dig uklare poster, mulige
                ekstraudgifter og præcis hvad du bør spørge om.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={user ? "/dashboard/upload" : "/opret"} className="btn-primary px-6 py-3 text-base">
                  Analysér et tilbud gratis <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/#saadan" className="btn-secondary px-6 py-3 text-base">
                  Sådan virker det
                </Link>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-ink-muted">
                <ShieldCheck className="h-4 w-4 text-brand-600" /> Første analyse er gratis. Intet kreditkort.
              </p>
            </div>
            <HeroMock />
          </div>
        </section>

        {/* Stats band */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="px-2 text-center">
                <p className="num font-display text-3xl font-semibold text-brand-800">{s.value}</p>
                <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="saadan" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <p className="eyebrow">Sådan virker det</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">Tre trin fra tilbud til tryghed</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="num text-sm font-semibold text-ink-muted">Trin {i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-brand-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">Hvorfor FixFlow</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
              Vi sælger ikke AI. Vi sælger tryghed.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-100">
              Et badeværelse eller nye vinduer koster ofte mere end en bil. Du skal ikke være ekspert for at forstå,
              hvad du siger ja til. De fleste håndværkere er seriøse – FixFlow hjælper jer med at blive enige om det
              samme fra start.
            </p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-brand-900 p-6">
                  <f.icon className="h-6 w-6 text-brand-300" />
                  <h3 className="mt-4 font-sans text-base font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-100/90">{f.text}</p>
                </div>
              ))}
              <div className="flex flex-col justify-between bg-brand-800 p-6">
                <p className="font-display text-xl font-semibold text-white">Klar til at prøve?</p>
                <Link href={user ? "/dashboard/upload" : "/opret"} className="btn-light mt-6 self-start">
                  Start gratis <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="priser" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="max-w-2xl">
              <p className="eyebrow">Priser</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Mindre end en times håndværkerløn</h2>
              <p className="mt-4 text-lg text-ink-soft">Start gratis. Opgradér kun, hvis du har brug for mere.</p>
            </div>
            <div className="mt-10">
              <PricingCards />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-white/60">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-semibold sm:text-4xl">Ofte stillede spørgsmål</h2>
            <div className="mt-10">
              <Faq />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
