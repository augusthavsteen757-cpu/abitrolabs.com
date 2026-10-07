import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { Check, Sparkles, FlaskConical, Receipt, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { payments, quotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PRO_PRICE_DKK, SINGLE_PRICE_DKK, getUsage } from "@/lib/plans";
import { getDict, getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";
import { isStripeEnabled } from "@/lib/billing";
import { cn, formatDate, formatKr } from "@/lib/format";
import { CheckoutButton } from "@/components/CheckoutButton";
import { AccountSettings } from "@/components/AccountSettings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).account.metaTitle };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; quote?: string; betalt?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const usage = getUsage(user);
  const { locale, d } = await getI18n();
  const t = d.account;
  const intl = INTL_LOCALE[locale];
  const date = (v: Date | null) => formatDate(v, intl);
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
      <h1 className="text-3xl font-semibold sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-ink-soft">
        {user.name} · {user.email}
      </p>

      {sp.betalt && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <CheckCircle2 className="h-4 w-4" /> {t.paid}
        </p>
      )}

      {simulated && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{t.testMode}</strong> {t.testModeText}
          </p>
        </div>
      )}

      {/* Current plan */}
      <section className="card mt-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">{t.yourPlan}</p>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold">
              {isPro && <Sparkles className="h-5 w-5 text-brand-500" />}
              {isPro ? d.nav.pro : d.nav.free}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {isPro
                ? `${fmt(t.usagePro, { used: usage.used, limit: usage.limit })}${usage.periodEnd ? fmt(t.resets, { date: date(usage.periodEnd) }) : ""}.`
                : fmt(t.usageFree, { used: usage.used, limit: usage.limit })}
              {usage.credits > 0 && fmt(t.credits, { n: usage.credits })}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="num font-display text-4xl font-semibold text-brand-800">{usage.remaining}</p>
            <p className="text-sm text-ink-muted">{usage.remaining === 1 ? t.remainingOne : t.remainingOther}</p>
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
          {fmt(t.unlockFor, { title: quote.title || quote.fileName })}
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
            {isPro && <span className="badge bg-brand-300 text-brand-950">{t.active}</span>}
          </div>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="num font-display text-3xl font-semibold">{PRO_PRICE_DKK} kr.</span>
            <span className={upgrade === "pro" ? "text-brand-100" : "text-ink-muted"}>{d.common.perMonth}</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {d.plans.pro.features.map((f) => (
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
                  {fmt(t.cancelled, { date: date(user.planEndsAt) })}
                </p>
                <CheckoutButton kind="RESUME" dark={upgrade === "pro"} className={upgrade === "pro" ? "btn-light" : "btn-primary"}>
                  {t.resume}
                </CheckoutButton>
              </div>
            ) : isPro ? (
              <CheckoutButton
                kind="CANCEL"
                className="btn-secondary"
                dark={upgrade === "pro"}
                confirmText={fmt(t.cancelConfirm, { date: date(usage.periodEnd) })}
              >
                {t.cancel}
              </CheckoutButton>
            ) : (
              <CheckoutButton kind="PRO_MONTHLY" dark={upgrade === "pro"} className={upgrade === "pro" ? "btn-light" : "btn-primary"} redirectTo="/dashboard/konto">
                {t.upgrade}
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
          <h2 className={cn("text-xl font-semibold", (upgrade === "single" || quote) && "text-white")}>{d.plans.single.name}</h2>
          <p className="mt-2">
            <span className="num font-display text-3xl font-semibold">{SINGLE_PRICE_DKK} kr.</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {d.plans.single.features.map((f) => (
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
              {quote ? t.buyAndUnlock : t.buyOne}
            </CheckoutButton>
          </div>
        </section>
      </div>

      {/* History */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Receipt className="h-5 w-5 text-brand-600" /> {t.payments}
        </h2>
        {history.length === 0 ? (
          <p className="card mt-4 p-5 text-sm text-ink-muted">{t.noPayments}</p>
        ) : (
          <div className="card mt-4 divide-y divide-line">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.kind === "PRO_MONTHLY" ? t.payPro : t.paySingle}</p>
                  <p className="text-xs text-ink-muted">
                    {date(p.createdAt)} · {p.provider === "simulated" ? t.payTest : t.payStripe}
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
