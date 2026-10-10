import Link from "next/link";
import { ChevronRight, Loader2, XCircle, Lock } from "lucide-react";
import type { Quote } from "@/db/schema";
import { ScoreRing } from "./ScoreRing";
import { formatKr, formatShortDate } from "@/lib/format";
import { scoreLabel } from "@/lib/score";
import type { Dict } from "@/i18n/dict";

export function QuoteCard({ quote, locked, d, intlLocale }: { quote: Quote; locked: boolean; d: Dict; intlLocale: string }) {
  return (
    <Link
      href={`/dashboard/tilbud/${quote.id}`}
      className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-lift sm:p-5"
    >
      {quote.status === "DONE" && quote.score != null ? (
        <ScoreRing score={quote.score} size={56} srText={d.quote.scoreAria.replace("{score}", String(quote.score))} />
      ) : quote.status === "FAILED" ? (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <XCircle className="h-6 w-6" />
        </span>
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-paper text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-ink-muted">{quote.contractorName || quote.fileName}</p>
        <p className="truncate font-semibold text-ink">{quote.title || d.quoteCard.analyzing}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
          {quote.status === "DONE" ? (
            <>
              <span className="num font-medium text-ink-soft">{formatKr(quote.totalInclVat)}</span>
              <span aria-hidden>·</span>
              <span>{quote.score != null ? scoreLabel(quote.score, d.score) : ""}</span>
            </>
          ) : quote.status === "FAILED" ? (
            <span className="text-red-700">{d.quoteCard.failed}</span>
          ) : (
            <span>{d.quoteCard.inProgress}</span>
          )}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-ink-muted sm:flex">
        <span>{formatShortDate(quote.createdAt, intlLocale)}</span>
        {locked && quote.status === "DONE" && (
          <span className="badge bg-paper text-ink-muted ring-1 ring-line">
            <Lock className="h-3 w-3" /> {d.quoteCard.basic}
          </span>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
