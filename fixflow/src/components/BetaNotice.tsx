import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { BETA_ANALYSES_TOTAL, PACK3_PRICE_DKK, SINGLE_PRICE_DKK } from "@/lib/plans";

/** Shown instead of prices and purchase options while the app runs as a free beta. */
export async function BetaNotice({ cta = true, usedUp = false }: { cta?: boolean; usedUp?: boolean }) {
  const d = await getDict();
  const t = d.beta;
  // What will cost money later – shown as free now, with the later price stated plainly (no struck-through
  // "before" price: these prices have never been charged, so that would be misleading).
  const plans = [
    { key: "single", plan: d.plans.single, price: SINGLE_PRICE_DKK },
    { key: "pack", plan: d.plans.pack, price: PACK3_PRICE_DKK },
  ];
  const n = BETA_ANALYSES_TOTAL;
  return (
    <div className="card overflow-hidden" data-testid="beta-notice">
      <div className="bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
        <span className="badge bg-brand-700 text-white">
          <Sparkles className="h-3.5 w-3.5" /> {t.badge}
        </span>
        <h3 className="mt-4 font-sans text-xl font-semibold">{usedUp ? fmt(t.usedUpTitle, { n }) : t.title}</h3>
        <p className="mt-2 text-[15px] text-ink-soft">{usedUp ? fmt(t.usedUpText, { n }) : fmt(t.text, { n })}</p>
        {cta && !usedUp && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="beta-plans">
            {plans.map(({ key, plan, price }) => (
              <div key={key} className="rounded-xl border border-line bg-white p-4">
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{plan.tagline}</p>
                <p className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="num font-display text-3xl font-semibold">0 kr.</span>
                  <span className="badge bg-brand-100 text-brand-800">{t.freeNow}</span>
                </p>
                <p className="mt-1 text-sm text-ink-muted">{fmt(t.afterTrial, { price })}</p>
              </div>
            ))}
          </div>
        )}
        {!usedUp && <p className="mt-4 text-sm text-ink-muted">{t.later}</p>}
        {cta && !usedUp && (
          <Link href="/opret" className="btn-primary mt-5 inline-flex">
            {t.cta}
          </Link>
        )}
      </div>
    </div>
  );
}
