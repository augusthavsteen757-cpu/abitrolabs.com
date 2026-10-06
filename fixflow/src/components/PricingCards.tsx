import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/format";

export function PricingCards() {
  const cards = [
    { key: "FREE", plan: PLANS.FREE, cta: "Kom i gang gratis", href: "/opret", highlight: false },
    { key: "PRO", plan: PLANS.PRO, cta: "Vælg Pro", href: "/opret?plan=pro", highlight: true },
    { key: "SINGLE", plan: PLANS.SINGLE, cta: "Køb én analyse", href: "/opret?plan=single", highlight: false },
  ] as const;
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {cards.map(({ key, plan, cta, href, highlight }) => (
        <div
          key={key}
          className={cn(
            "relative flex flex-col rounded-2xl border p-6 sm:p-7",
            highlight ? "border-brand-700 bg-brand-900 text-white shadow-lift" : "border-line bg-white shadow-card",
          )}
        >
          {highlight && (
            <span className="absolute -top-3 left-6 rounded-full bg-brand-300 px-3 py-1 text-xs font-semibold text-brand-950">
              Mest valgt
            </span>
          )}
          <h3 className={cn("text-xl font-semibold", highlight ? "text-white" : "text-ink")}>{plan.name}</h3>
          <p className={cn("mt-1 text-sm", highlight ? "text-brand-100" : "text-ink-muted")}>{plan.tagline}</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="num font-display text-4xl font-semibold">{plan.priceLabel}</span>
            {plan.period && <span className={highlight ? "text-brand-100" : "text-ink-muted"}>{plan.period}</span>}
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
            {cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
