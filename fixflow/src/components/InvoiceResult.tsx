import { ChevronDown, ShieldCheck } from "lucide-react";
import type { Dict } from "@/i18n/dict";
import { fmt } from "@/i18n/fmt";
import { cn, formatDate, formatMoney } from "@/lib/format";
import { invoiceDifference, type InvoiceItem, type InvoiceItemStatus, type InvoiceResult } from "@/lib/invoice";
import { CopyButton } from "./QuoteActions";
import { DeleteInvoiceCheckButton } from "./InvoiceCheck";

const STATUS_CLS: Record<InvoiceItemStatus, string> = {
  new: "border-red-300",
  higher: "border-amber-400",
  open_in_quote: "border-sky-300",
  lower: "border-brand-300",
  as_quoted: "border-line",
};

/** One invoice compared with the quote. Plain server component – the numbers are worked out by Klardal, not the AI. */
export function InvoiceResultView({
  d,
  intl,
  quoteId,
  checkId,
  checkedAt,
  result,
  quote,
}: {
  d: Dict;
  intl: string;
  quoteId: string;
  checkId: string;
  checkedAt: Date;
  result: InvoiceResult;
  quote: { inclVat: number | null; currency: string };
}) {
  const t = d.invoice;
  const money = (n: number | null | undefined) => formatMoney(n, result.currency);
  const diff = invoiceDifference(result, quote);
  const dc = result.documentCheck;
  const groups: { status: InvoiceItemStatus; title: string }[] = [
    { status: "new", title: t.newTitle },
    { status: "higher", title: t.higherTitle },
    { status: "open_in_quote", title: t.openTitle },
    { status: "lower", title: t.lowerTitle },
  ];
  const asQuoted = result.items.filter((i) => i.status === "as_quoted");
  const differences = result.items.length - asQuoted.length + result.missingFromInvoice.length;

  const row = (i: InvoiceItem, n: number) => (
    <li key={n} className={cn("border-l-4 py-2.5 pl-3", STATUS_CLS[i.status])}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words font-medium leading-snug">{i.description}</p>
        <p className="num shrink-0 font-semibold">{money(i.invoiceAmount)}</p>
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">
        {i.status === "new" ? "" : i.quoteAmount != null ? fmt(t.inQuote, { amount: money(i.quoteAmount) }) : t.noQuotePrice}
        {i.note && <span className="text-ink-soft">{i.status === "new" ? "" : " · "}{i.note}</span>}
      </p>
    </li>
  );

  return (
    <article className="card p-5 sm:p-6" data-testid="invoice-result">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {result.contractorName ? fmt(t.resultTitle, { firm: result.contractorName }) : t.resultTitleNoFirm}
        </h3>
        <p className="text-sm text-ink-muted">
          {result.invoiceDate ? `${formatDate(result.invoiceDate, intl)} · ` : ""}
          {fmt(t.checkedOn, { date: formatDate(checkedAt, intl) })}
        </p>
      </div>

      {result.demo && <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">{t.demoNote}</p>}
      {!!result.cprHidden && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t.cprHidden}
        </p>
      )}
      {dc.sameJob === "no" && <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{t.otherJob}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="invoice-totals">
        <div>
          <dt className="text-sm text-ink-muted">{t.quoteTotal}</dt>
          <dd className="num text-lg font-semibold">{formatMoney(quote.inclVat, quote.currency)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">{t.invoiceTotal}</dt>
          <dd className="num text-lg font-semibold">{money(result.invoiceInclVat)}</dd>
        </div>
        {diff != null && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-sm text-ink-muted">{t.difference}</dt>
            <dd className={cn("num text-lg font-semibold", diff > 0.5 ? "text-red-800" : "text-brand-800")} data-testid="invoice-difference">
              {Math.abs(diff) < 1 ? t.differenceSame : fmt(diff > 0 ? t.differenceMore : t.differenceLess, { amount: money(Math.abs(diff)) })}
            </dd>
          </div>
        )}
      </dl>
      {dc.invoiceKind === "partial" && <p className="mt-3 rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm text-sky-900">{t.partial}</p>}
      {dc.invoiceKind === "unclear" && <p className="mt-3 text-sm text-ink-muted">{t.kindUnclear}</p>}

      {result.summary && <p className="mt-4 leading-relaxed text-ink-soft">{result.summary}</p>}
      {(dc.readability !== "good" || dc.suspiciousInstructions) && (
        <ul className="mt-3 list-disc space-y-1 rounded-xl border border-amber-200 bg-amber-50 py-2.5 pl-8 pr-3.5 text-sm text-amber-900">
          {dc.readability !== "good" && <li>{fmt(t.unreadable, { note: dc.unreadableNote ?? "" })}</li>}
          {dc.suspiciousInstructions && <li>{t.injection}</li>}
        </ul>
      )}

      {differences === 0 && <p className="mt-4 font-medium text-brand-800">{t.noDifferences}</p>}
      {groups.map(({ status, title }) => {
        const items = result.items.filter((i) => i.status === status);
        if (!items.length) return null;
        return (
          <section key={status} className="mt-5" data-testid={`invoice-${status}`}>
            <h4 className="font-semibold">{title}</h4>
            <ul className="mt-2 space-y-1">{items.map(row)}</ul>
          </section>
        );
      })}
      {result.missingFromInvoice.length > 0 && (
        <section className="mt-5" data-testid="invoice-missing">
          <h4 className="font-semibold">{t.missingTitle}</h4>
          <p className="text-sm text-ink-muted">{t.missingNote}</p>
          <ul className="mt-2 space-y-1">
            {result.missingFromInvoice.map((m, n) => (
              <li key={n} className="flex items-start justify-between gap-3 border-l-4 border-line py-2 pl-3">
                <span className="min-w-0 break-words">{m.description}</span>
                {m.quoteAmount != null && <span className="num shrink-0 text-ink-muted">{money(m.quoteAmount)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {asQuoted.length > 0 && (
        <details className="group mt-5">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            {fmt(t.asQuotedTitle, { n: asQuoted.length })}
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="mt-2 space-y-1">{asQuoted.map(row)}</ul>
        </details>
      )}

      {result.questions.length > 0 && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">{t.questionsTitle}</h4>
            <CopyButton label={t.copyQuestions} text={result.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")} />
          </div>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {result.questions.map((q, i) => (
              <li key={i}>
                <p className="font-medium leading-snug">{q.question}</p>
                {q.why && <p className="text-sm text-ink-muted">{q.why}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-6 rounded-xl bg-paper px-4 py-3 text-xs leading-relaxed text-ink-soft" data-testid="invoice-disclaimer">
        <p>{t.disclaimer}</p>
        <p className="mt-1">{t.disputeHint}</p>
      </div>
      <div className="mt-3 text-right">
        <DeleteInvoiceCheckButton quoteId={quoteId} checkId={checkId} />
      </div>
    </article>
  );
}
