import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  HelpCircle,
  ShieldAlert,
  Building2,
  CalendarDays,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getQuote, listMessages } from "@/lib/quotes";
import {
  CATEGORIES,
  CHECK_LABELS,
  PRICE_TYPE_LABELS,
  categoryTotals,
  parseStoredAnalysis,
  type Category,
} from "@/lib/analysis";
import { FREE_QUESTION_LIMIT, hasFullAccess } from "@/lib/plans";
import { cn, formatDate, formatKr, formatRange } from "@/lib/format";
import { ScoreRing, scoreColor } from "@/components/ScoreRing";
import { SEVERITY, SeverityBadge } from "@/components/Severity";
import { CopyButton, DeleteQuoteButton, RetryButton, UnlockWithCreditButton } from "@/components/QuoteActions";
import { MessageComposer } from "@/components/MessageComposer";
import { Paywall } from "@/components/Paywall";

export const metadata: Metadata = { title: "Tilbud" };

const CATEGORY_COLORS: Record<Category, string> = {
  Arbejdsløn: "bg-brand-700",
  Materialer: "bg-brand-400",
  Kørsel: "bg-amber-400",
  Bortskaffelse: "bg-stone-400",
  "Leje af udstyr": "bg-sky-400",
  Projektering: "bg-violet-400",
  Diverse: "bg-red-400",
};

const CLARITY = {
  clear: { label: "Tydelig", cls: "bg-brand-50 text-brand-700 ring-1 ring-brand-200" },
  vague: { label: "Delvist beskrevet", cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
  unclear: { label: "Uklar", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
} as const;

function SectionTitle({ icon: Icon, children, id }: { icon?: typeof HelpCircle; children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex scroll-mt-24 items-center gap-2.5 text-2xl font-semibold">
      {Icon && <Icon className="h-6 w-6 text-brand-600" />}
      {children}
    </h2>
  );
}

export default async function QuotePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const quote = await getQuote(user.id, params.id);
  if (!quote) notFound();

  const back = (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> Alle tilbud
    </Link>
  );

  const analysis = parseStoredAnalysis(quote.analysisJson);
  if (quote.status !== "DONE" || !analysis) {
    return (
      <div className="mx-auto max-w-xl">
        {back}
        <div className="card mt-6 p-6 text-center sm:p-10">
          <XCircle className={cn("mx-auto h-10 w-10", quote.status === "FAILED" ? "text-red-500" : "text-ink-muted")} />
          <h1 className="mt-4 text-2xl font-semibold">
            {quote.status === "FAILED" ? "Analysen mislykkedes" : "Analysen er ikke færdig"}
          </h1>
          <p className="mt-2 text-ink-soft">
            {quote.error || "Prøv igen om lidt."} Du er ikke blevet trukket for en analyse.
          </p>
          <p className="mt-1 text-sm text-ink-muted">{quote.fileName}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <RetryButton id={quote.id} />
            <DeleteQuoteButton id={quote.id} />
          </div>
        </div>
      </div>
    );
  }

  const full = hasFullAccess(user, quote);
  const messages = full ? await listMessages(quote.id) : [];
  const cats = categoryTotals(analysis);
  const catTotal = Object.values(cats).reduce((s, v) => s + Math.max(0, v), 0);
  const visibleQuestions = full ? analysis.questions : analysis.questions.slice(0, FREE_QUESTION_LIMIT);
  const hiddenCount = analysis.questions.length - visibleQuestions.length;
  const color = scoreColor(analysis.score.total);
  const priceTypeBadge =
    analysis.priceType === "fast_pris"
      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
      : analysis.priceType === "tilbud"
        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
        : "bg-amber-50 text-amber-800 ring-1 ring-amber-200";

  const suggestions = [
    ...analysis.flags.filter((f) => f.severity !== "low").map((f) => f.title),
    "Hvornår kan I starte, og hvornår er I færdige?",
    "Kan prisen laves som fast pris?",
  ].slice(0, 6);

  return (
    <div className="animate-fade-up">
      {back}

      {/* Header */}
      <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={cn("badge", priceTypeBadge)}>{PRICE_TYPE_LABELS[analysis.priceType]}</span>
            <span className="badge bg-white text-ink-soft ring-1 ring-line">{quote.projectName}</span>
            {analysis.demo && <span className="badge bg-amber-100 text-amber-900">Demo-analyse</span>}
          </div>
          <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl">{analysis.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <Building2 className="h-4 w-4 text-ink-muted" />
              {analysis.contractor.name || "Ukendt firma"}
              {analysis.contractor.cvr ? (
                <span className="text-ink-muted">· CVR {analysis.contractor.cvr}</span>
              ) : (
                <span className="text-red-700">· intet CVR</span>
              )}
            </span>
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <CalendarDays className="h-4 w-4 text-ink-muted" />
              {formatDate(analysis.quoteDate)}
              {analysis.validUntil && <span className="text-ink-muted">· gælder til {formatDate(analysis.validUntil)}</span>}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <a href={`/api/quotes/${quote.id}/file`} target="_blank" rel="noopener" className="btn-secondary">
            <ExternalLink className="h-4 w-4" /> Se original
          </a>
          <DeleteQuoteButton id={quote.id} />
        </div>
      </header>

      {/* Overview */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-6" aria-labelledby="score-h">
          <h2 id="score-h" className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Tilbudsscore
          </h2>
          <div className="mt-4 flex justify-center">
            <ScoreRing score={analysis.score.total} size={148} label={analysis.score.label} />
          </div>
          <ul className="mt-6 space-y-4">
            {analysis.score.breakdown.map((b) => (
              <li key={b.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className="num text-ink-muted">
                    {b.points}/{b.max}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
                  <div className={cn("h-full rounded-full", color.bar)} style={{ width: `${(b.points / b.max) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{b.hint}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Kort fortalt</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{analysis.summary}</p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-paper p-4">
                <dt className="text-xs text-ink-muted">Pris inkl. moms</dt>
                <dd className="num mt-1 font-display text-2xl font-semibold">{formatKr(analysis.totals.inclVat)}</dd>
              </div>
              <div className="rounded-xl bg-paper p-4">
                <dt className="text-xs text-ink-muted">Heraf moms</dt>
                <dd className="num mt-1 font-display text-2xl font-semibold">{formatKr(analysis.totals.vat)}</dd>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <dt className="text-xs text-red-800">Mulige ekstraudgifter inkl. moms</dt>
                <dd className="num mt-1 font-display text-xl font-semibold text-red-800">
                  {formatRange(analysis.extraCostRisk.min * 1.25, analysis.extraCostRisk.max * 1.25)}
                </dd>
              </div>
            </dl>
            {analysis.extraCostRisk.explanation && (
              <p className="mt-3 text-sm text-ink-muted">{analysis.extraCostRisk.explanation}</p>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Hvor går pengene hen?</h2>
            {catTotal > 0 ? (
              <>
                <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-paper" role="img" aria-label="Fordeling af beløbet på kategorier">
                  {CATEGORIES.filter((c) => cats[c] > 0).map((c) => (
                    <div key={c} className={CATEGORY_COLORS[c]} style={{ width: `${(cats[c] / catTotal) * 100}%` }} title={`${c}: ${formatKr(cats[c])}`} />
                  ))}
                </div>
                <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {CATEGORIES.filter((c) => cats[c] > 0).map((c) => (
                    <li key={c} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CATEGORY_COLORS[c])} />
                        <span className="truncate">{c}</span>
                      </span>
                      <span className="num text-ink-soft">
                        {formatKr(cats[c])} <span className="text-ink-muted">({Math.round((cats[c] / catTotal) * 100)} %)</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-muted">Beløb ekskl. moms.</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Der var ingen poster med beløb i tilbuddet.</p>
            )}
          </section>
        </div>
      </div>

      {/* Flags */}
      <section className="mt-12">
        <SectionTitle icon={ShieldAlert}>Det skal du være opmærksom på</SectionTitle>
        {analysis.flags.length === 0 ? (
          <p className="card mt-5 p-5 text-ink-soft">Vi fandt ingen punkter, der kræver særlig opmærksomhed. Godt tegn!</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {analysis.flags.map((f, i) => {
              const s = SEVERITY[f.severity];
              const hasExtra = f.estimatedExtraMax != null && f.estimatedExtraMax > 0;
              return (
                <article key={i} className={cn("card flex flex-col border-l-4 p-5", s.border)}>
                  <div className="flex items-start gap-3">
                    <s.icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconColor)} />
                    <div className="min-w-0 flex-1">
                      <SeverityBadge severity={f.severity} />
                      <h3 className="mt-2 font-sans text-base font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{f.explanation}</p>
                      {hasExtra && (
                        <p className="num mt-2 text-sm font-medium text-ink">
                          Mulig ekstraudgift: {formatRange((f.estimatedExtraMin ?? 0) * 1.25, (f.estimatedExtraMax ?? 0) * 1.25)} inkl. moms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={full ? `?spoerg=${encodeURIComponent(f.title)}#besked` : "#besked"}
                      scroll={!full}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                    >
                      <MessageSquareText className="h-4 w-4" /> Spørg håndværkeren
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Line items */}
      <section className="mt-12">
        <SectionTitle>Hvad du betaler for</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">Alle beløb er ekskl. moms, som i tilbuddet.</p>
        <div className="card mt-5 divide-y divide-line">
          {analysis.lineItems.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-sans font-semibold">{item.description}</h3>
                  <span className={cn("badge", CLARITY[item.clarity].cls)}>{CLARITY[item.clarity].label}</span>
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{item.explanation}</p>
                <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", CATEGORY_COLORS[item.category])} />
                    {item.category}
                  </span>
                  {item.quantity != null && item.unitPrice != null && (
                    <span className="num">
                      {item.quantity.toLocaleString("da-DK")} {item.unit ?? ""} × {formatKr(item.unitPrice)}
                    </span>
                  )}
                  {item.note && <span className="text-amber-800">{item.note}</span>}
                </p>
              </div>
              <p className="num shrink-0 font-display text-lg font-semibold sm:text-right">{formatKr(item.amount)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between bg-paper/60 p-4 sm:p-5">
            <span className="font-semibold">I alt ekskl. moms</span>
            <span className="num font-display text-lg font-semibold">{formatKr(analysis.totals.exclVat)}</span>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="mt-12">
        <SectionTitle>Står det i tilbuddet?</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">
          {analysis.checks.filter((c) => c.present).length} af 10 vigtige punkter er med.
        </p>
        <ul className="card mt-5 grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {analysis.checks.map((c) => (
            <li key={c.key} className="flex gap-3 p-4 sm:border-b sm:border-line sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:border-r">
              {c.present ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-label="Ja" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-label="Nej" />
              )}
              <div className="min-w-0">
                <p className="font-medium">{CHECK_LABELS[c.key]}</p>
                {c.note && <p className="mt-0.5 text-sm text-ink-muted">{c.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Questions */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={HelpCircle}>Spørgsmål til håndværkeren</SectionTitle>
          {visibleQuestions.length > 0 && (
            <CopyButton
              label="Kopiér alle"
              text={visibleQuestions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}
            />
          )}
        </div>
        <ol className="mt-5 space-y-3">
          {visibleQuestions.map((q, i) => (
            <li key={i} className="card flex gap-4 p-4 sm:p-5">
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{q.question}</p>
                <p className="mt-1 text-sm text-ink-muted">{q.why}</p>
              </div>
              {q.priority === "high" && <span className="badge h-fit shrink-0 bg-red-50 text-red-700">Vigtig</span>}
            </li>
          ))}
        </ol>
        {hiddenCount > 0 && (
          <div className="mt-5">
            {user.extraCredits > 0 ? (
              <UnlockWithCreditButton id={quote.id} credits={user.extraCredits} />
            ) : (
              <Paywall
                compact
                quoteId={quote.id}
                title={`${hiddenCount} spørgsmål mere`}
                text="Få alle spørgsmål og beskedgeneratoren til dette tilbud."
              />
            )}
          </div>
        )}
      </section>

      {/* Message composer */}
      <section className="mt-12" id="besked">
        <SectionTitle icon={MessageSquareText}>Skriv til håndværkeren</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">Vælg et emne og en tone – så skriver vi en høflig besked, du kan sende.</p>
        <div className="mt-5">
          {full ? (
            <Suspense>
              <MessageComposer
                quoteId={quote.id}
                suggestions={suggestions}
                initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
              />
            </Suspense>
          ) : user.extraCredits > 0 ? (
            <UnlockWithCreditButton id={quote.id} credits={user.extraCredits} />
          ) : (
            <Paywall
              quoteId={quote.id}
              title="Beskedgeneratoren er en del af Pro"
              text="Få en færdig, høflig besked til håndværkeren med ét klik – eller lås kun dette tilbud op."
            />
          )}
        </div>
      </section>

      <p className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
        Analysen er vejledende og bygger på det, der står i det uploadede dokument. Tilbudsscoren er beregnet efter faste
        regler og siger noget om, hvor tydeligt tilbuddet er – ikke om håndværkerens faglige kvalitet. Beløb for mulige
        ekstraudgifter er skøn. FixFlow erstatter ikke juridisk eller byggeteknisk rådgivning.
      </p>
    </div>
  );
}
