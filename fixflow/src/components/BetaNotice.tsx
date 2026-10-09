import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { BETA_ANALYSES_TOTAL } from "@/lib/plans";

/** Shown instead of prices and purchase options while the app runs as a free beta. */
export async function BetaNotice({ cta = true, usedUp = false }: { cta?: boolean; usedUp?: boolean }) {
  const t = (await getDict()).beta;
  const n = BETA_ANALYSES_TOTAL;
  return (
    <div className="card overflow-hidden" data-testid="beta-notice">
      <div className="bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
        <span className="badge bg-brand-700 text-white">
          <Sparkles className="h-3.5 w-3.5" /> {t.badge}
        </span>
        <h3 className="mt-4 font-sans text-xl font-semibold">{usedUp ? fmt(t.usedUpTitle, { n }) : t.title}</h3>
        <p className="mt-2 text-[15px] text-ink-soft">{usedUp ? fmt(t.usedUpText, { n }) : fmt(t.text, { n })}</p>
        {!usedUp && <p className="mt-2 text-sm text-ink-muted">{t.later}</p>}
        {cta && !usedUp && (
          <Link href="/opret" className="btn-primary mt-5 inline-flex">
            {t.cta}
          </Link>
        )}
      </div>
    </div>
  );
}
