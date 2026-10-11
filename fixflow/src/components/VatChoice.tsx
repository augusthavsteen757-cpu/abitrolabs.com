"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { cn } from "@/lib/format";

type Choice = "excl" | "incl";

/** Shown when the quote doesn't say whether prices include VAT: both readings, and the user picks. */
export function VatChoice({ quoteId, choice, assumed, prices }: { quoteId: string; choice: Choice | null; assumed: Choice; prices: Record<Choice, string> }) {
  const { d } = useI18n();
  const t = d.quote;
  const router = useRouter();
  const [busy, setBusy] = useState<Choice | null>(null);
  const [error, setError] = useState(false);
  const active = choice ?? assumed;

  async function pick(c: Choice) {
    if (busy || c === choice) return;
    setBusy(c);
    setError(false);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/vat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choice: c }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950" data-testid="vat-choice">
      <p className="font-semibold">{t.vatTitle}</p>
      <p className="mt-0.5 text-amber-900">{t.vatText}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t.vatTitle}>
        {(["excl", "incl"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active === c}
            onClick={() => pick(c)}
            disabled={busy != null}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border bg-white p-3 text-left transition",
              active === c ? "border-brand-600 ring-2 ring-brand-200" : "border-line hover:border-brand-300",
            )}
          >
            <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", active === c ? "border-brand-600 bg-brand-600 text-white" : "border-ink-muted")}>
              {busy === c ? <Loader2 className="h-3 w-3 animate-spin" /> : active === c && <Check className="h-3 w-3" />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-ink">{c === "excl" ? t.vatExcl : t.vatIncl}</span>
              <span className="num block text-ink-soft">{fmt(t.vatResult, { amount: prices[c] })}</span>
              {active === c && <span className="block text-xs text-ink-muted">{choice ? t.vatChosen : t.vatAssumed}</span>}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-red-700" role="alert">{t.vatError}</p>}
    </div>
  );
}
