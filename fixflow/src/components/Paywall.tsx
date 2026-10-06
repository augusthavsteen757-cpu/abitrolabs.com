import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { CheckoutButton } from "./CheckoutButton";
import { PRO_PRICE_DKK, SINGLE_PRICE_DKK } from "@/lib/plans";

type Props = {
  title: string;
  text: string;
  /** If set, the single purchase unlocks this quote. */
  quoteId?: string;
  showSingle?: boolean;
  compact?: boolean;
};

export function Paywall({ title, text, quoteId, showSingle = true, compact = false }: Props) {
  return (
    <div className={compact ? "rounded-2xl border border-brand-200 bg-brand-50/60 p-5" : "card overflow-hidden"}>
      <div className={compact ? "" : "bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8"}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-sans text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-[15px] text-ink-soft">{text}</p>
          </div>
        </div>
        <div className={`mt-5 grid gap-3 ${showSingle ? "sm:grid-cols-2" : ""}`}>
          <div className="rounded-xl border border-brand-700 bg-brand-900 p-4 text-white">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-brand-300" /> Pro
            </p>
            <p className="mt-1 text-sm text-brand-100">10 analyser/md., sammenligning og alle værktøjer.</p>
            <div className="mt-3">
              <CheckoutButton kind="PRO_MONTHLY" className="btn-light" dark>
                Opgradér – {PRO_PRICE_DKK} kr./md.
              </CheckoutButton>
            </div>
          </div>
          {showSingle && (
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-sm font-semibold">Engangskøb</p>
              <p className="mt-1 text-sm text-ink-soft">
                {quoteId ? "Lås dette tilbud helt op." : "Én komplet analyse uden abonnement."}
              </p>
              <div className="mt-3">
                <CheckoutButton kind="SINGLE" quoteId={quoteId} className="btn-secondary">
                  Køb – {SINGLE_PRICE_DKK} kr.
                </CheckoutButton>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Se alle muligheder på <Link href="/dashboard/konto" className="underline">din konto</Link>.
        </p>
      </div>
    </div>
  );
}
