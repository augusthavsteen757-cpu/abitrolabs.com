import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { Check, Sparkles, FlaskConical, Receipt, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { payments, quotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PLANS, getUsage } from "@/lib/plans";
import { isStripeEnabled } from "@/lib/billing";
import { cn, formatDate, formatKr } from "@/lib/format";
import { CheckoutButton } from "@/components/CheckoutButton";
import { AccountSettings } from "@/components/AccountSettings";

export const metadata: Metadata = { title: "Konto" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; quote?: string; betalt?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const usage = getUsage(user);
  const history = await db.query.payments.findMany({
    where: eq(payments.userId, user.id),
    orderBy: [desc(payments.createdAt)],
  });
  const upgrade = sp.upgrade;
  const quoteId = sp.quote;
  const quote = quoteId
    ? await db.query.quotes.findFirst({ where: and(eq(quotes.id, quoteId), eq(quotes.userId, user.id)) })
    : null;
  const simulated = !isStripeEnabled();
  const isPro = user.plan === "PRO";

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-4xl">Konto</h1>
      <p className="mt-2 text-ink-soft">
        {user.name} · {user.email}
      </p>

      {sp.betalt && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <CheckCircle2 className="h-4 w-4" /> Tak for din betaling. Det kan tage et øjeblik, før den er registreret.
        </p>
      )}

      {simulated && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Testtilstand:</strong> Betaling er ikke sat op endnu, så køb gennemføres med det samme uden at trække
            penge. Det er perfekt til at prøve funktionerne af.
          </p>
        </div>
      )}

      {/* Current plan */}
      <section className="card mt-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">Dit abonnement</p>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold">
              {isPro && <Sparkles className="h-5 w-5 text-brand-500" />}
              {isPro ? "Pro" : "Gratis"}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {isPro
                ? `${usage.used} af ${usage.limit} analyser brugt i denne periode${usage.periodEnd ? ` · nulstilles ${formatDate(usage.periodEnd)}` : ""}.`
                : `${usage.used} af ${usage.limit} gratis analyse brugt.`}
              {usage.credits > 0 && ` Du har ${usage.credits} engangskøb til gode.`}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="num font-display text-4xl font-semibold text-brand-800">{usage.remaining}</p>
            <p className="text-sm text-ink-muted">{usage.remaining === 1 ? "analyse" : "analyser"} tilbage</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-brand-500"
            style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }}
          />
        </div>
      </section>

      {quote && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Engangskøbet bruges til at låse <strong>{quote.title || quote.fileName}</strong> op.
        </p>
      )}

      {/* Plans */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section
          className={cn(
            "flex flex-col rounded-2xl border p-6",
            upgrade === "pro" ? "border-brand-700 bg-brand-900 text-white shadow-lift ring-4 ring-brand-300/40" : "border-line bg-white shadow-card",
          )}
        >
          <div className="flex items-center justify-between">
            <h2 className={cn("text-xl font-semibold", upgrade === "pro" && "text-white")}>Pro</h2>
            {isPro && <span className="badge bg-brand-300 text-brand-950">Aktiv</span>}
          </div>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="num font-display text-3xl font-semibold">{PLANS.PRO.priceLabel}</span>
            <span className={upgrade === "pro" ? "text-brand-100" : "text-ink-muted"}>/md.</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {PLANS.PRO.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", upgrade === "pro" ? "text-brand-300" : "text-brand-600")} />
                <span className={upgrade === "pro" ? "text-brand-50" : "text-ink-soft"}>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {isPro && user.planEndsAt ? (
              <div>
                <p className={cn("mb-3 text-sm", upgrade === "pro" ? "text-brand-100" : "text-ink-soft")}>
                  Opsagt. Pro fortsætter til {formatDate(user.planEndsAt)}.
                </p>
                <CheckoutButton kind="RESUME" dark={upgrade === "pro"} className={upgrade === "pro" ? "btn-light" : "btn-primary"}>
                  Genoptag Pro
                </CheckoutButton>
              </div>
            ) : isPro ? (
              <CheckoutButton
                kind="CANCEL"
                className="btn-secondary"
                dark={upgrade === "pro"}
                confirmText={`Vil du opsige Pro? Du beholder Pro til ${formatDate(usage.periodEnd)}, og dine analyser bliver liggende.`}
              >
                Opsig Pro
              </CheckoutButton>
            ) : (
              <CheckoutButton kind="PRO_MONTHLY" dark={upgrade === "pro"} className={upgrade === "pro" ? "btn-light" : "btn-primary"} redirectTo="/dashboard/konto">
                Opgradér til Pro
              </CheckoutButton>
            )}
          </div>
        </section>

        <section
          className={cn(
            "flex flex-col rounded-2xl border p-6",
            upgrade === "single" || quote ? "border-brand-700 bg-brand-900 text-white shadow-lift ring-4 ring-brand-300/40" : "border-line bg-white shadow-card",
          )}
        >
          <h2 className={cn("text-xl font-semibold", (upgrade === "single" || quote) && "text-white")}>Engangskøb</h2>
          <p className="mt-2">
            <span className="num font-display text-3xl font-semibold">{PLANS.SINGLE.priceLabel}</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {PLANS.SINGLE.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", upgrade === "single" || quote ? "text-brand-300" : "text-brand-600")} />
                <span className={upgrade === "single" || quote ? "text-brand-50" : "text-ink-soft"}>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <CheckoutButton
              kind="SINGLE"
              dark={upgrade === "single" || !!quote}
              quoteId={quote?.id}
              className={upgrade === "single" || quote ? "btn-light" : "btn-secondary"}
              redirectTo={quote ? `/dashboard/tilbud/${quote.id}` : "/dashboard/konto"}
            >
              {quote ? "Køb og lås tilbuddet op" : "Køb én analyse"}
            </CheckoutButton>
          </div>
        </section>
      </div>

      {/* History */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Receipt className="h-5 w-5 text-brand-600" /> Betalinger
        </h2>
        {history.length === 0 ? (
          <p className="card mt-4 p-5 text-sm text-ink-muted">Du har ingen betalinger endnu.</p>
        ) : (
          <div className="card mt-4 divide-y divide-line">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.kind === "PRO_MONTHLY" ? "Pro – 1 måned" : "Engangskøb – 1 analyse"}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(p.createdAt)} · {p.provider === "simulated" ? "Testbetaling" : "Kort via Stripe"}
                  </p>
                </div>
                <p className="num shrink-0 font-semibold">{formatKr(p.amountDkk)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <AccountSettings postalCode={user.postalCode ?? ""} />
    </div>
  );
}
