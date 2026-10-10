import { translateError } from "@/i18n/errors";
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
  ChevronDown,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getQuote, listMessages } from "@/lib/quotes";
import { distanceKm, locatePostalCode, postalCodeFromText } from "@/lib/geo";
import {
  CATEGORIES,
  languageDisplayName,
  categoryTotals,
  parseStoredAnalysis,
  redactForFree,
  type Category,
} from "@/lib/analysis";
import { hasFullAccess } from "@/lib/plans";
import { cn, formatDate, formatMoney, formatRange } from "@/lib/format";
import { ScoreRing, scoreColor } from "@/components/ScoreRing";
import { SEVERITY } from "@/components/Severity";
import { CopyButton, DeleteQuoteButton, RetryButton, UnlockWithCreditButton } from "@/components/QuoteActions";
import { MessageComposer } from "@/components/MessageComposer";
import { Paywall } from "@/components/Paywall";
import { ReportAnalysis } from "@/components/ReportAnalysis";
import { Locked } from "@/components/Locked";
import { getDict, getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";
import { computeScore } from "@/lib/score";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).quote.metaTitle };
}

const CATEGORY_COLORS: Record<Category, string> = {
  Arbejdsløn: "bg-brand-700",
  Materialer: "bg-brand-400",
  Kørsel: "bg-amber-400",
  Bortskaffelse: "bg-stone-400",
  "Leje af udstyr": "bg-sky-400",
  Projektering: "bg-violet-400",
  Diverse: "bg-red-400",
};

const CLARITY_CLS = {
  clear: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  vague: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  unclear: "bg-red-50 text-red-700 ring-1 ring-red-200",
} as const;

function SectionTitle({ icon: Icon, children, id }: { icon?: typeof HelpCircle; children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex scroll-mt-24 items-center gap-2 text-xl font-semibold sm:text-2xl">
      {Icon && <Icon className="h-5 w-5 text-brand-600 sm:h-6 sm:w-6" aria-hidden />}
      {children}
    </h2>
  );
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const quote = await getQuote(user.id, id);
  if (!quote) notFound();
  const { locale, d } = await getI18n();
  const t = d.quote;
  const L = d.labels;
  const intl = INTL_LOCALE[locale];

  const back = (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> {t.back}
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
            {quote.status === "FAILED" ? t.failedTitle : t.notDoneTitle}
          </h1>
          <p className="mt-2 text-ink-soft">
            {quote.error ? translateError(quote.error, d) : t.tryLater} {t.notCharged}
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
  // Free users get a preview: the paid details are removed on the server, never just hidden with CSS.
  const { analysis: view, lock } = full ? { analysis, lock: null } : redactForFree(analysis);
  const origin = await locatePostalCode(user.postalCode);
  const firmPlace = origin ? await locatePostalCode(postalCodeFromText(analysis.contractor.address ?? null)) : null;
  const distance = origin && firmPlace ? Math.round(distanceKm(origin, firmPlace)) : null;
  const messages = full ? await listMessages(quote.id) : [];
  const cats = categoryTotals(analysis);
  const catTotal = Object.values(cats).reduce((s, v) => s + Math.max(0, v), 0);
  const cur = view.currency || "DKK";
  const money = (n: number | null | undefined) => formatMoney(n, cur);
  const foreign = cur !== "DKK" || view.language !== "da";
  const visibleQuestions = view.questions;
  const hiddenCount = lock?.questions ?? 0;
  const lockedFlags = lock?.flags.length ?? 0;
  // Re-computed for display so the wording follows the viewer's language (the points never change).
  const score = computeScore(analysis, d.score);
  const color = scoreColor(score.total);
  const sourceLanguage = languageDisplayName(view.language, intl);
  // Honest uncertainty: what the AI couldn't read, and where Klardal's own cross-checks disagree with it.
  const dc = view.documentCheck;
  const q = view.quality;
  const qualityNotes = [
    dc?.readability === "poor" ? t.qualityPoor : dc?.readability === "partial" ? t.qualityPartial : null,
    dc?.unreadableNote && dc.readability !== "good" ? fmt(t.qualityUnreadable, { note: dc.unreadableNote }) : null,
    q?.itemsMismatch && q.statedExclVat != null ? fmt(t.qualityMismatch, { items: money(q.itemsSum), total: money(q.statedExclVat) }) : null,
    q?.vatMismatch ? t.qualityVat : null,
    !view.demo && dc?.vatStated === "unclear" ? t.qualityVatUnclear : null,
    q?.implausibleAmounts ? t.qualityImplausible : null,
    dc?.suspiciousInstructions ? t.qualityInjection : null,
  ].filter((x): x is string => !!x);
  const writtenIn = view.outputLocale && view.outputLocale !== locale ? languageDisplayName(view.outputLocale, intl) : null;
  const priceTypeBadge =
    analysis.priceType === "fast_pris"
      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
      : analysis.priceType === "tilbud"
        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
        : "bg-amber-50 text-amber-800 ring-1 ring-amber-200";

  const suggestions = [
    ...analysis.flags.filter((f) => f.severity !== "low").map((f) => f.title),
    t.suggestionStart,
    t.suggestionFixed,
  ].slice(0, 6);

  // Most important first; the original index is kept because the free-plan lock refers to it.
  const SEV_ORDER = { high: 0, medium: 1, low: 2 } as const;
  const flags = view.flags.map((f, i) => ({ f, i })).sort((a, b) => SEV_ORDER[a.f.severity] - SEV_ORDER[b.f.severity]);
  const TOP = 3;
  const extraMax = view.extraCostRisk.max * 1.25;
  const worstCase = !lock?.extra && analysis.totals.inclVat != null && extraMax > 0 ? analysis.totals.inclVat + extraMax : null;
  // Show the first two sentences; the rest folds out so the page stays short on a phone.
  // A sentence ends at . ! ? followed by a space and a capital letter – so "122.500 kr. inkl." is not split.
  const sentences = analysis.summary.split(/(?<=[.!?])\s+(?=[\p{Lu}"„«(])/u);
  const summaryShort = sentences.slice(0, 2).join(" ").trim();
  const summaryRest = sentences.slice(2).join(" ").trim();

  const flagCard = ({ f, i }: (typeof flags)[number]) => {
    const s = SEVERITY[f.severity];
    const flagLocked = lock?.flags.includes(i) ?? false;
    const hasExtra = f.estimatedExtraMax != null && f.estimatedExtraMax > 0;
    return (
      <article key={i} className={cn("card border-l-4 p-4 sm:p-5", s.border)}>
        <div className="flex items-start gap-3">
          <s.icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconColor)} aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="font-sans text-base font-semibold leading-snug">
              <span className="sr-only">{L.severity[f.severity]}: </span>
              {f.title}
            </h3>
            {flagLocked ? (
              <Locked lines={2} label={t.seeExplanation} className="mt-2" />
            ) : (
              <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{f.explanation}</p>
            )}
            {hasExtra && (
              <p className="num mt-2 text-sm font-medium text-ink">
                {fmt(t.extraLine, { range: formatRange((f.estimatedExtraMin ?? 0) * 1.25, (f.estimatedExtraMax ?? 0) * 1.25, cur) })}
              </p>
            )}
            <Link
              href={full ? `?spoerg=${encodeURIComponent(f.title)}#besked` : "#besked"}
              scroll={!full}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <MessageSquareText className="h-4 w-4" /> {t.askContractor}
            </Link>
          </div>
        </div>
      </article>
    );
  };

  const question = (q: (typeof visibleQuestions)[number], n: number) => (
    <li key={n} className="flex gap-3 p-4">
      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{q.question}</p>
        {q.why && <p className="mt-1 text-sm text-ink-muted">{q.why}</p>}
      </div>
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      {back}

      {/* Header */}
      <header className="mt-4">
        <div className="flex flex-wrap gap-2">
          <span className={cn("badge", priceTypeBadge)}>{L.priceType[analysis.priceType]}</span>
          <span className="badge bg-white text-ink-soft ring-1 ring-line">{quote.projectName}</span>
          {analysis.demo && <span className="badge bg-amber-100 text-amber-900">{t.demoBadge}</span>}
        </div>
        <h1 className="mt-3 break-words text-2xl font-semibold sm:text-4xl">{analysis.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-soft">
          <Building2 className="h-4 w-4 text-ink-muted" aria-hidden />
          {analysis.contractor.name || d.common.unknownFirm}
          {!analysis.contractor.cvr && <span className="text-red-700">· {t.noCvr}</span>}
          {distance != null && <span className="text-ink-muted">· {fmt(t.distance, { km: distance })}</span>}
          <span className="text-ink-muted">
            · {formatDate(analysis.quoteDate, intl)}
            {analysis.validUntil && ` · ${fmt(t.validUntil, { date: formatDate(analysis.validUntil, intl) })}`}
          </span>
        </p>
        <div className="mt-3 flex gap-2">
          <a href={`/api/quotes/${quote.id}/file`} target="_blank" rel="noopener" className="btn-secondary px-3 py-1.5 text-sm">
            <ExternalLink className="h-4 w-4" /> {t.viewOriginal}
          </a>
          <DeleteQuoteButton id={quote.id} />
        </div>
      </header>

      {analysis.demo && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="demo-notice">
          <p className="font-semibold">{t.demoNoticeTitle}</p>
          <p className="mt-0.5">{t.demoNoticeText}</p>
        </div>
      )}

      {/* Verdict: the three numbers that matter */}
      <section className="card mt-6 p-5 sm:p-6" aria-label={t.scoreTitle}>
        <div className="flex items-center gap-5">
          <ScoreRing score={score.total} size={104} label={score.label} srText={fmt(t.scoreAria, { score: score.total })} />
          <dl className="min-w-0 flex-1 space-y-2.5">
            <div>
              <dt className="text-xs text-ink-muted">{t.priceIncl}</dt>
              <dd className="num font-display text-2xl font-semibold leading-tight">{money(analysis.totals.inclVat)}</dd>
            </div>
            <div>
              <dt className="text-xs text-red-800">{t.extraIncl}</dt>
              <dd className="num text-base font-semibold text-red-800">
                {lock?.extra ? (
                  <Locked lines={1} label={t.seeAmount} />
                ) : (
                  formatRange(view.extraCostRisk.min * 1.25, extraMax, cur)
                )}
              </dd>
            </div>
          </dl>
        </div>
        {worstCase != null && (
          <p className="num mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
            {fmt(t.worstCase, { amount: money(worstCase) })}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-muted">{t.scoreNote}</p>
      </section>

      {/* Short summary */}
      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t.summary}</h2>
        {writtenIn && <p className="mt-2 text-xs text-ink-muted">{fmt(t.analysisLanguageNote, { language: writtenIn })}</p>}
        {foreign && (
          <p className="mt-3 rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm text-sky-900">
            {fmt(t.foreign, { language: sourceLanguage || t.otherLanguage })}{" "}
            {cur !== "DKK" ? `${fmt(t.foreignCurrency, { currency: cur })} ` : ""}
            {t.foreignRut}
          </p>
        )}
        <p className="mt-2 leading-relaxed text-ink-soft">{summaryShort}</p>
        {summaryRest && (
          <details className="group mt-1">
            <summary className="cursor-pointer list-none text-sm font-semibold text-brand-700 group-open:hidden">{t.readMore}</summary>
            <p className="leading-relaxed text-ink-soft">{summaryRest}</p>
          </details>
        )}
        {qualityNotes.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="quality-notes">
            <p className="font-semibold">{t.qualityTitle}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {qualityNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {!full && (
        <section id="laas-op" className="mt-6 scroll-mt-24">
          {user.extraCredits > 0 ? (
            <UnlockWithCreditButton id={quote.id} credits={user.extraCredits} />
          ) : (
            <Paywall quoteId={quote.id} title={t.unlockTitle} text={t.unlockText} />
          )}
        </section>
      )}

      {/* Most important findings */}
      <section className="mt-10">
        <SectionTitle icon={ShieldAlert}>{t.flagsTitle}</SectionTitle>
        {flags.length === 0 ? (
          <p className="card mt-4 p-5 text-ink-soft">{t.noFlags}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {flags.slice(0, TOP).map(flagCard)}
            {flags.length > TOP && (
              <details className="group">
                <summary className="btn-secondary w-full cursor-pointer list-none justify-center group-open:hidden">
                  {fmt(t.showAllFlags, { n: flags.length })}
                </summary>
                <div className="space-y-3">{flags.slice(TOP).map(flagCard)}</div>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Questions */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={HelpCircle}>{t.questionsTitle}</SectionTitle>
          {visibleQuestions.length > 0 && (
            <CopyButton label={t.copyAll} text={visibleQuestions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")} />
          )}
        </div>
        <div className="card mt-4">
          <ol className="divide-y divide-line">{visibleQuestions.slice(0, TOP).map((q, i) => question(q, i + 1))}</ol>
          {visibleQuestions.length > TOP && (
            <details className="group border-t border-line">
              <summary className="cursor-pointer list-none p-4 text-sm font-semibold text-brand-700 group-open:hidden">
                {fmt(t.showAllQuestions, { n: visibleQuestions.length })}
              </summary>
              <ol className="divide-y divide-line">{visibleQuestions.slice(TOP).map((q, i) => question(q, i + TOP + 1))}</ol>
            </details>
          )}
        </div>
        {hiddenCount > 0 && (
          <a href="#laas-op" className="card mt-3 flex items-center gap-4 p-4 hover:shadow-lift">
            <Locked lines={2} label={fmt(t.moreQuestions, { n: hiddenCount })} className="flex-1" asLink={false} />
          </a>
        )}
      </section>

      {/* Message composer */}
      <section className="mt-10" id="besked">
        <SectionTitle icon={MessageSquareText}>{t.messageTitle}</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">{t.messageIntro}</p>
        <div className="mt-4">
          {full ? (
            <Suspense>
              <MessageComposer
                quoteId={quote.id}
                suggestions={suggestions}
                initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
              />
            </Suspense>
          ) : (
            <a href="#laas-op" className="card flex flex-col gap-3 p-5 hover:shadow-lift">
              <p className="text-sm text-ink-soft">{t.messageLocked}</p>
              <Locked lines={4} label={t.unlockMessages} asLink={false} />
            </a>
          )}
        </div>
      </section>

      {/* Everything else, folded away */}
      <section className="mt-10">
        <SectionTitle>{t.detailsTitle}</SectionTitle>
        <div className="card mt-4 divide-y divide-line">
          <Fold title={t.itemsTitle}>
            {view.extraCostRisk.explanation && <p className="mb-3 text-sm text-ink-soft">{view.extraCostRisk.explanation}</p>}
            {catTotal > 0 && (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-paper" role="img" aria-label={t.categoryAria}>
                  {CATEGORIES.filter((c) => cats[c] > 0).map((c) => (
                    <div key={c} className={CATEGORY_COLORS[c]} style={{ width: `${(cats[c] / catTotal) * 100}%` }} title={`${L.category[c]}: ${money(cats[c])}`} />
                  ))}
                </div>
                <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {CATEGORIES.filter((c) => cats[c] > 0).map((c) => (
                    <li key={c} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CATEGORY_COLORS[c])} />
                        <span className="truncate">{L.category[c]}</span>
                      </span>
                      <span className="num text-ink-soft">{money(cats[c])}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {view.lineItems.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t.noItems}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {view.lineItems.map((item, i) => (
                  <li key={i} className="p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-medium leading-snug">
                        {item.description}{" "}
                        <span className={cn("badge ml-1 align-middle", CLARITY_CLS[item.clarity])}>{L.clarity[item.clarity]}</span>
                      </p>
                      <p className="num shrink-0 font-semibold">{money(item.amount)}</p>
                    </div>
                    {lock?.items.includes(i) ? (
                      <Locked lines={1} label={t.seeItem} className="mt-1.5" />
                    ) : (
                      item.explanation && <p className="mt-1 text-sm text-ink-soft">{item.explanation}</p>
                    )}
                    {(item.note || (item.quantity != null && item.unitPrice != null)) && (
                      <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-muted">
                        {item.quantity != null && item.unitPrice != null && (
                          <span className="num">
                            {item.quantity.toLocaleString(intl)} {item.unit ?? ""} × {money(item.unitPrice)}
                          </span>
                        )}
                        {item.note && <span className="text-amber-800">{item.note}</span>}
                      </p>
                    )}
                  </li>
                ))}
                <li className="flex items-center justify-between bg-paper/60 p-3.5 text-sm">
                  <span className="font-semibold">{t.totalExcl}</span>
                  <span className="num font-semibold">{money(analysis.totals.exclVat)}</span>
                </li>
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-muted">{t.itemsNote}</p>
          </Fold>

          <Fold title={t.checklistTitle} meta={fmt(t.checklistCount, { n: analysis.checks.filter((c) => c.present).length })}>
            <ul className="space-y-3">
              {analysis.checks.map((c) => (
                <li key={c.key} className="flex gap-3">
                  {c.present ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-label={t.yes} />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-label={t.no} />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{L.check[c.key]}</p>
                    {c.note && <p className="text-sm text-ink-muted">{c.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Fold>

          {view.rules.length > 0 && (
            <Fold title={t.rulesTitle}>
              <p className="mb-3 text-sm text-ink-muted">{t.rulesIntro}</p>
              <ul className="space-y-3">
                {view.rules.map((rule) => (
                  <li key={rule.key} className="flex gap-3">
                    {rule.status === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-label={t.ruleOk} />
                    ) : rule.status === "missing" ? (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-label={t.ruleMissing} />
                    ) : (
                      <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-label={t.ruleUnclear} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{L.rule[rule.key]}</p>
                      {lock ? <Locked lines={1} label={t.seeNote} className="mt-1" /> : rule.note && <p className="text-sm text-ink-muted">{rule.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Fold>
          )}

          <Fold title={t.priceLevelTitle}>
            {lock ? (
              <Locked lines={1} label={t.priceLevelLocked} />
            ) : (
              <div className="text-sm">
                <span
                  className={cn(
                    "badge",
                    view.priceLevel.level === "normal"
                      ? "bg-brand-50 text-brand-700"
                      : view.priceLevel.level === "hoej"
                        ? "bg-red-50 text-red-700"
                        : view.priceLevel.level === "lav"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-paper text-ink-muted",
                  )}
                >
                  {L.priceLevel[view.priceLevel.level]}
                </span>
                {view.priceLevel.explanation && <p className="mt-1.5 text-ink-soft">{view.priceLevel.explanation}</p>}
                <p className="mt-1 text-xs text-ink-muted">{t.priceLevelNote}</p>
              </div>
            )}
          </Fold>

          <Fold title={t.scoreDetails}>
            <ul className="space-y-4">
              {score.breakdown.map((b) => (
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
          </Fold>
        </div>
      </section>

      <div className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
        <p>
          {t.disclaimerShort}{" "}
        </p>
        <details className="group mt-1">
          <summary className="cursor-pointer list-none font-semibold text-ink-soft underline group-open:hidden">{t.readMore}</summary>
          <p>{t.disclaimer}</p>
        </details>
      </div>
      {!view.demo && (
        <div className="mt-3">
          <ReportAnalysis quoteId={quote.id} />
        </div>
      )}
    </div>
  );
}

/** A collapsed section – closed by default so the page stays short on a phone. */
function Fold({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-5">
        <span className="min-w-0">
          <span className="font-semibold">{title}</span>
          {meta && <span className="block text-sm text-ink-muted">{meta}</span>}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-ink-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 pb-5 sm:px-5">{children}</div>
    </details>
  );
}
