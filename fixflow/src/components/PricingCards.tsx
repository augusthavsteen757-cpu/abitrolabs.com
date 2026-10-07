import Link from "next/link";
import { Check } from "lucide-react";
import { PRO_PRICE_DKK, SINGLE_PRICE_DKK } from "@/lib/plans";
import { cn } from "@/lib/format";
import { getDict } from "@/i18n/server";

export async function PricingCards() {
  const d = await getDict();
  const cards = [
    { key: "FREE", plan: d.plans.free, price: "0 kr.", period: "", href: "/opret", highlight: false },
    { key: "PRO", plan: d.plans.pro, price: `${PRO_PRICE_DKK} kr.`, period: d.common.perMonth, href: "/opret?plan=pro", highlight: true },
    { key: "SINGLE", plan: d.plans.single, price: `${SINGLE_PRICE_DKK} kr.`, period: "", href: "/opret?plan=single", highlight: false },
  ];
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {cards.map(({ key, plan, price, period, href, highlight }) => (
        <div
          key={key}
          className={cn(
            "relative flex flex-col rounded-2xl border p-6 sm:p-7",
            highlight ? "border-brand-700 bg-brand-900 text-white shadow-lift" : "border-line bg-white shadow-card",
          )}
        >
          {highlight && (
            <span className="absolute -top-3 left-6 rounded-full bg-brand-300 px-3 py-1 text-xs font-semibold text-brand-950">
              {d.plans.popular}
            </span>
          )}
          <h3 className={cn("text-xl font-semibold", highlight ? "text-white" : "text-ink")}>{plan.name}</h3>
          <p className={cn("mt-1 text-sm", highlight ? "text-brand-100" : "text-ink-muted")}>{plan.tagline}</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="num font-display text-4xl font-semibold">{price}</span>
            {period && <span className={highlight ? "text-brand-100" : "text-ink-muted"}>{period}</span>}
          </p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", highlight ? "text-brand-300" : "text-brand-600")} />
                <span className={highlight ? "text-brand-50" : "text-ink-soft"}>{f}</span>
              </li>
            ))}
          </ul>
          <Link href={href} className={cn("mt-7 w-full", highlight ? "btn-light" : "btn-secondary")}>
            {plan.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
