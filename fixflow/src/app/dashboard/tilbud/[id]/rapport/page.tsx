import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getQuote } from "@/lib/quotes";
import { analysisOfQuote, flagsBySeverity } from "@/lib/analysis";
import { negotiationPoints } from "@/lib/negotiation";
import { hasFullAccess } from "@/lib/plans";
import { computeScore, scoreBand } from "@/lib/score";
import { formatDate, formatMoney, formatRange } from "@/lib/format";
import { PrintButton } from "@/components/QuoteActions";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The full report on one plain page, made for printing: the browser's "Gem som PDF" turns it into a PDF file.
 * (A PDF made on the server couldn't show every language's letters; the browser can.) Full report only.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const quote = await getQuote(user.id, id);
  if (!quote) notFound();
  const analysis = analysisOfQuote(quote);
  if (quote.status !== "DONE" || !analysis) notFound();
  // The basic analysis has no report – it would hand out the paid details.
  if (!hasFullAccess(user, quote)) redirect(`/dashboard/tilbud/${quote.id}#laas-op`);

  const { locale, d } = await getI18n();
  const t = d.quote;
  const L = d.labels;
  const intl = INTL_LOCALE[locale];
  const cur = analysis.currency || "DKK";
  const money = (n: number | null | undefined) => formatMoney(n, cur);
  const score = computeScore(analysis, d.score);
  const extraMax = analysis.extraCostRisk.max * 1.25;
  const worstCase = analysis.totals.inclVat != null && extraMax > 0 ? analysis.totals.inclVat + extraMax : null;
  const flags = flagsBySeverity(analysis.flags);
  const missing = analysis.checks.filter((c) => !c.present);
  const present = analysis.checks.filter((c) => c.present);
  const negotiation = negotiationPoints(analysis);

  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 className="mt-8 break-after-avoid border-b border-line pb-1 font-sans text-lg font-semibold">{children}</h2>
  );

  return (
    <article className="mx-auto max-w-3xl text-[15px] leading-relaxed print:max-w-none print:text-[12px]" data-testid="report">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/tilbud/${quote.id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {t.pdfBack}
        </Link>
        <div className="text-right">
          <PrintButton label={t.pdfPrint} />
          <p className="mt-1 text-xs text-ink-muted">{t.pdfHint}</p>
        </div>
      </div>

      <header>
        <p className="text-sm font-semibold text-brand-700">{t.pdfTitle}</p>
        <h1 className="mt-1 break-words font-sans text-2xl font-semibold">{analysis.title}</h1>
        <p className="mt-1 text-ink-soft">
          {analysis.contractor.name || d.common.unknownFirm}
          {analysis.contractor.cvr ? ` · CVR ${analysis.contractor.cvr}` : ` · ${t.noCvr}`} · {formatDate(analysis.quoteDate, intl)}
        </p>
        <p className="text-sm text-ink-muted">{fmt(t.pdfMade, { date: formatDate(quote.updatedAt, intl) })}</p>
      </header>

      <H>{t.summary}</H>
      <p className="mt-2 font-semibold">
        {fmt(t.scoreAria, { score: score.total })} – {score.label}. {t.verdict[scoreBand(score.total)]}
      </p>
      <p className="mt-2">{analysis.summary}</p>

      <H>{t.priceTitle}</H>
      <p className="mt-2">
        {t.priceIncl}: <strong className="num">{money(analysis.totals.inclVat)}</strong>
      </p>
      {extraMax > 0 && (
        <p>
          {t.extraIncl}: <strong className="num">{formatRange(analysis.extraCostRisk.min * 1.25, extraMax, cur)}</strong>
        </p>
      )}
      {worstCase != null && <p>{fmt(t.worstCase, { amount: money(worstCase) })}</p>}
      {analysis.extraCostRisk.explanation && <p className="mt-1 text-ink-soft">{analysis.extraCostRisk.explanation}</p>}

      <H>{t.flagsTitle}</H>
      {flags.length === 0 ? (
        <p className="mt-2">{t.noFlags}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {flags.map((f, i) => (
            <li key={i} className="break-inside-avoid">
              <p className="font-semibold">
                {L.severity[f.severity]}: {f.title}
              </p>
              {f.explanation && <p className="text-ink-soft">{f.explanation}</p>}
              {f.estimatedExtraMax != null && f.estimatedExtraMax > 0 && (
                <p className="num text-sm">
                  {fmt(t.extraLine, { range: formatRange((f.estimatedExtraMin ?? 0) * 1.25, f.estimatedExtraMax * 1.25, cur) })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {negotiation.length > 0 && (
        <>
          <H>{t.negotiationTitle}</H>
          <p className="mt-1 text-sm text-ink-muted">{t.negotiationIntro}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {negotiation.map((p, i) => (
              <li key={`${p.key}-${i}`}>{fmt(t.negotiation[p.key], { title: p.title ?? "" })}</li>
            ))}
          </ol>
        </>
      )}

      <H>{t.checklistTitle}</H>
      {missing.length === 0 ? (
        <p className="mt-2">{t.checksAllPresent}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {missing.map((c) => (
            <li key={c.key}>
              <strong>{L.check[c.key]}</strong>
              {c.note && ` – ${c.note}`}
            </li>
          ))}
        </ul>
      )}
      {present.length > 0 && (
        <p className="mt-2 text-sm text-ink-muted">
          {fmt(t.checksPresent, { n: present.length })}: {present.map((c) => L.check[c.key]).join(", ")}
        </p>
      )}

      {analysis.questions.length > 0 && (
        <>
          <H>{t.questionsTitle}</H>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {analysis.questions.map((q, i) => (
              <li key={i}>{q.question}</li>
            ))}
          </ol>
        </>
      )}

      {analysis.lineItems.length > 0 && (
        <>
          <H>{t.itemsTitle}</H>
          <table className="mt-2 w-full border-collapse text-sm">
            <tbody>
              {analysis.lineItems.map((it, i) => (
                <tr key={i} className="break-inside-avoid border-b border-line align-top">
                  <td className="py-1.5 pr-3">
                    <span className="font-medium">{it.description}</span> <span className="text-ink-muted">({L.clarity[it.clarity]})</span>
                    {it.explanation && <span className="block text-ink-soft">{it.explanation}</span>}
                  </td>
                  <td className="num whitespace-nowrap py-1.5 text-right">{money(it.amount)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 pr-3 font-semibold">{t.totalExcl}</td>
                <td className="num whitespace-nowrap py-1.5 text-right font-semibold">{money(analysis.totals.exclVat)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-xs text-ink-muted">{quote.vatChoice === "incl" ? t.itemsNoteConverted : t.itemsNote}</p>
        </>
      )}

      {analysis.rules.length > 0 && (
        <>
          <H>{t.rulesTitle}</H>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {analysis.rules.map((r) => (
              <li key={r.key}>
                <strong>{L.rule[r.key]}</strong>: {r.status === "ok" ? t.ruleOk : r.status === "missing" ? t.ruleMissing : t.ruleUnclear}
                {r.note && ` – ${r.note}`}
              </li>
            ))}
          </ul>
        </>
      )}

      <H>{t.priceLevelTitle}</H>
      <p className="mt-2">
        <strong>{L.priceLevel[analysis.priceLevel.level]}</strong>
        {analysis.priceLevel.explanation && ` – ${analysis.priceLevel.explanation}`}
      </p>
      <p className="text-xs text-ink-muted">{t.priceLevelNote}</p>

      <footer className="mt-10 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
        <p>{t.disclaimerShort}</p>
        <p className="mt-1">{t.disclaimer}</p>
      </footer>
    </article>
  );
}
