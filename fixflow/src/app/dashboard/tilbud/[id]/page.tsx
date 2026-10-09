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
  CalendarDays,
  MapPin,
  Landmark,
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
import { SEVERITY, SeverityBadge } from "@/components/Severity";
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
    <h2 id={id} className="flex scroll-mt-24 items-center gap-2.5 text-2xl font-semibold">
      {Icon && <Icon className="h-6 w-6 text-brand-600" />}
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

  return (
    <div className="animate-fade-up">
      {back}

      {/* Header */}
      <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={cn("badge", priceTypeBadge)}>{L.priceType[analysis.priceType]}</span>
            <span className="badge bg-white text-ink-soft ring-1 ring-line">{quote.projectName}</span>
            {analysis.demo && <span className="badge bg-amber-100 text-amber-900">{t.demoBadge}</span>}
          </div>
          <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl">{analysis.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <Building2 className="h-4 w-4 text-ink-muted" />
              {analysis.contractor.name || d.common.unknownFirm}
              {analysis.contractor.cvr ? (
                <span className="text-ink-muted">· CVR {analysis.contractor.cvr}</span>
              ) : (
                <span className="text-red-700">· {t.noCvr}</span>
              )}
            </span>
            {analysis.contractor.address && (
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <MapPin className="h-4 w-4 text-ink-muted" />
                {analysis.contractor.address}
                {distance != null && <span className="text-ink-muted">· {fmt(t.distance, { km: distance })}</span>}
              </span>
            )}
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <CalendarDays className="h-4 w-4 text-ink-muted" />
              {formatDate(analysis.quoteDate, intl)}
              {analysis.validUntil && <span className="text-ink-muted">· {fmt(t.validUntil, { date: formatDate(analysis.validUntil, intl) })}</span>}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <a href={`/api/quotes/${quote.id}/file`} target="_blank" rel="noopener" className="btn-secondary">
            <ExternalLink className="h-4 w-4" /> {t.viewOriginal}
          </a>
          <DeleteQuoteButton id={quote.id} />
        </div>
      </header>

      {/* Overview */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-6" aria-labelledby="score-h">
          <h2 id="score-h" className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-muted">
            {t.scoreTitle}
          </h2>
          <div className="mt-4 flex justify-center">
            <ScoreRing score={score.total} size={148} label={score.label} />
          </div>
          <p className="mt-3 text-center text-xs text-ink-muted">{t.scoreNote}</p>
          <ul className="mt-6 space-y-4">
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
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold">{t.summary}</h2>
            {writtenIn && <p className="mt-2 text-xs text-ink-muted">{fmt(t.analysisLanguageNote, { language: writtenIn })}</p>}
            {foreign && (
              <p className="mt-3 rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm text-sky-900">
                {fmt(t.foreign, { language: sourceLanguage || t.otherLanguage })}{" "}
                {cur !== "DKK" ? `${fmt(t.foreignCurrency, { currency: cur })} ` : ""}
                {t.foreignRut}
              </p>
            )}
            <p className="mt-3 leading-relaxed text-ink-soft">{analysis.summary}</p>
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
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-paper p-4">
                <dt className="text-xs text-ink-muted">{t.priceIncl}</dt>
                <dd className="num mt-1 font-display text-2xl font-semibold">{money(analysis.totals.inclVat)}</dd>
              </div>
              <div className="rounded-xl bg-paper p-4">
                <dt className="text-xs text-ink-muted">{t.vat}</dt>
                <dd className="num mt-1 font-display text-2xl font-semibold">{money(analysis.totals.vat)}</dd>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <dt className="text-xs text-red-800">{t.extraIncl}</dt>
                <dd className="num mt-1 font-display text-xl font-semibold text-red-800">
                  {lock?.extra ? (
                    <Locked lines={1} label={t.seeAmount} />
                  ) : (
                    formatRange(view.extraCostRisk.min * 1.25, view.extraCostRisk.max * 1.25, cur)
                  )}
                </dd>
              </div>
            </dl>
            {view.extraCostRisk.explanation && (
              <p className="mt-3 text-sm text-ink-muted">{view.extraCostRisk.explanation}</p>
            )}
            <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-line p-4">
              <span className="text-sm font-semibold">{t.priceLevelTitle}</span>
              {lock ? (
                <Locked lines={1} label={t.priceLevelLocked} className="min-w-[180px] flex-1" />
              ) : (
                <div className="min-w-0 flex-1 text-sm">
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
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold">{t.whereMoney}</h2>
            {catTotal > 0 ? (
              <>
                <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-paper" role="img" aria-label={t.categoryAria}>
                  {CATEGORIES.filter((c) => cats[c] > 0).map((c) => (
                    <div key={c} className={CATEGORY_COLORS[c]} style={{ width: `${(cats[c] / catTotal) * 100}%` }} title={`${L.category[c]}: ${money(cats[c])}`} />
                  ))}
                </div>
                <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {CATEGORIES.filter((c) => cats[c] > 0).map((c) => (
                    <li key={c} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CATEGORY_COLORS[c])} />
                        <span className="truncate">{L.category[c]}</span>
                      </span>
                      <span className="num text-ink-soft">
                        {money(cats[c])} <span className="text-ink-muted">({Math.round((cats[c] / catTotal) * 100)} %)</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-muted">{t.amountsExcl}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">{t.noItems}</p>
            )}
          </section>
        </div>
      </div>

      {!full && (
        <section id="laas-op" className="mt-8 scroll-mt-24">
          {user.extraCredits > 0 ? (
            <UnlockWithCreditButton id={quote.id} credits={user.extraCredits} />
          ) : (
            <Paywall
              quoteId={quote.id}
              title={t.unlockTitle}
              text={t.unlockText}
            />
          )}
        </section>
      )}

      {/* Flags */}
      <section className="mt-12">
        <SectionTitle icon={ShieldAlert}>{t.flagsTitle}</SectionTitle>
        {analysis.flags.length === 0 ? (
          <p className="card mt-5 p-5 text-ink-soft">{t.noFlags}</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {view.flags.map((f, i) => {
              const s = SEVERITY[f.severity];
              const flagLocked = lock?.flags.includes(i) ?? false;
              const hasExtra = f.estimatedExtraMax != null && f.estimatedExtraMax > 0;
              return (
                <article key={i} className={cn("card flex flex-col border-l-4 p-5", s.border)}>
                  <div className="flex items-start gap-3">
                    <s.icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconColor)} />
                    <div className="min-w-0 flex-1">
                      <SeverityBadge severity={f.severity} label={L.severity[f.severity]} />
                      <h3 className="mt-2 font-sans text-base font-semibold">{f.title}</h3>
                      {flagLocked ? (
                        <Locked lines={3} label={t.seeExplanation} className="mt-2" />
                      ) : (
                        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{f.explanation}</p>
                      )}
                      {hasExtra && (
                        <p className="num mt-2 text-sm font-medium text-ink">
                          {fmt(t.extraLine, { range: formatRange((f.estimatedExtraMin ?? 0) * 1.25, (f.estimatedExtraMax ?? 0) * 1.25, cur) })}
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
                      <MessageSquareText className="h-4 w-4" /> {t.askContractor}
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
        <SectionTitle>{t.itemsTitle}</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">{t.itemsNote}</p>
        <div className="card mt-5 divide-y divide-line">
          {view.lineItems.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-sans font-semibold">{item.description}</h3>
                  <span className={cn("badge", CLARITY_CLS[item.clarity])}>{L.clarity[item.clarity]}</span>
                </div>
                {lock?.items.includes(i) ? (
                  <Locked lines={2} label={t.seeItem} className="mt-1.5" />
                ) : (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{item.explanation}</p>
                )}
                <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", CATEGORY_COLORS[item.category])} />
                    {L.category[item.category]}
                  </span>
                  {item.quantity != null && item.unitPrice != null && (
                    <span className="num">
                      {item.quantity.toLocaleString(intl)} {item.unit ?? ""} × {money(item.unitPrice)}
                    </span>
                  )}
                  {item.note && <span className="text-amber-800">{item.note}</span>}
                </p>
              </div>
              <p className="num shrink-0 font-display text-lg font-semibold sm:text-right">{money(item.amount)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between bg-paper/60 p-4 sm:p-5">
            <span className="font-semibold">{t.totalExcl}</span>
            <span className="num font-display text-lg font-semibold">{money(analysis.totals.exclVat)}</span>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="mt-12">
        <SectionTitle>{t.checklistTitle}</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">
          {fmt(t.checklistCount, { n: analysis.checks.filter((c) => c.present).length })}
        </p>
        <ul className="card mt-5 grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {analysis.checks.map((c) => (
            <li key={c.key} className="flex gap-3 p-4 sm:border-b sm:border-line sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:border-r">
              {c.present ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-label={t.yes} />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-label={t.no} />
              )}
              <div className="min-w-0">
                <p className="font-medium">{L.check[c.key]}</p>
                {c.note && <p className="mt-0.5 text-sm text-ink-muted">{c.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Danish rules */}
      {view.rules.length > 0 && (
        <section className="mt-12">
          <SectionTitle icon={Landmark}>{t.rulesTitle}</SectionTitle>
          <p className="mt-1 text-sm text-ink-muted">{t.rulesIntro}</p>
          <ul className="card mt-5 divide-y divide-line">
            {view.rules.map((rule) => (
              <li key={rule.key} className="flex gap-3 p-4">
                {rule.status === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-label={t.ruleOk} />
                ) : rule.status === "missing" ? (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-label={t.ruleMissing} />
                ) : (
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-label={t.ruleUnclear} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{L.rule[rule.key]}</p>
                  {lock ? (
                    <Locked lines={1} label={t.seeNote} className="mt-1" />
                  ) : (
                    rule.note && <p className="mt-0.5 text-sm text-ink-muted">{rule.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Questions */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={HelpCircle}>{t.questionsTitle}</SectionTitle>
          {visibleQuestions.length > 0 && (
            <CopyButton
              label={t.copyAll}
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
              {q.priority === "high" && <span className="badge h-fit shrink-0 bg-red-50 text-red-700">{t.important}</span>}
            </li>
          ))}
        </ol>
        {hiddenCount > 0 && (
          <a href="#laas-op" className="card mt-3 flex items-center gap-4 p-4 hover:shadow-lift sm:p-5">
            <Locked lines={2} label={fmt(t.moreQuestions, { n: hiddenCount })} className="flex-1" asLink={false} />
          </a>
        )}
      </section>

      {/* Message composer */}
      <section className="mt-12" id="besked">
        <SectionTitle icon={MessageSquareText}>{t.messageTitle}</SectionTitle>
        <p className="mt-1 text-sm text-ink-muted">{t.messageIntro}</p>
        <div className="mt-5">
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

      <p className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
        {t.disclaimer}
      </p>
      {!view.demo && (
        <div className="mt-3">
          <ReportAnalysis quoteId={quote.id} />
        </div>
      )}
    </div>
  );
}
