import Link from "next/link";
import type { Metadata } from "next";
import { FilePlus2, FileSearch, Gauge, AlertTriangle, Wallet, Columns3, Upload } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listQuotes } from "@/lib/quotes";
import { parseStoredAnalysis, redactForFree } from "@/lib/analysis";
import { formatRange } from "@/lib/format";
import { hasFullAccess } from "@/lib/plans";
import { QuoteCard } from "@/components/QuoteCard";
import { getDict, getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";
import type { Dict } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).dashboard.metaTitle };
}

function greeting(d: Dict) {
  const hour = Number(
    new Intl.DateTimeFormat("da-DK", { hour: "numeric", hour12: false, timeZone: "Europe/Copenhagen" }).format(new Date()),
  );
  if (hour < 5) return d.dashboard.night;
  if (hour < 10) return d.dashboard.morning;
  if (hour < 18) return d.dashboard.day;
  return d.dashboard.evening;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { locale, d } = await getI18n();
  const t = d.dashboard;
  const quotes = await listQuotes(user.id);
  const done = quotes.filter((q) => q.status === "DONE");
  const analyses = done
    .map((q) => {
      const a = parseStoredAnalysis(q.analysisJson);
      // Locked quotes only contribute what the free preview shows.
      return a && !hasFullAccess(user, q) ? redactForFree(a).analysis : a;
    })
    .filter((a) => a != null);

  const avgScore = done.length ? Math.round(done.reduce((s, q) => s + (q.score ?? 0), 0) / done.length) : null;
  const seriousFlags = analyses.reduce((s, a) => s + a.flags.filter((f) => f.severity === "high").length, 0);
  const extraMin = analyses.reduce((s, a) => s + a.extraCostRisk.min * 1.25, 0);
  const extraMax = analyses.reduce((s, a) => s + a.extraCostRisk.max * 1.25, 0);

  const groups = new Map<string, typeof quotes>();
  for (const q of quotes) {
    const list = groups.get(q.projectName) ?? [];
    list.push(q);
    groups.set(q.projectName, list);
  }

  const stats = [
    { icon: FileSearch, label: t.statAnalyzed, value: String(done.length) },
    { icon: Gauge, label: t.statAvg, value: avgScore != null ? `${avgScore}` : "–" },
    { icon: AlertTriangle, label: t.statSerious, value: String(seriousFlags) },
    { icon: Wallet, label: t.statExtra, value: analyses.length ? formatRange(extraMin, extraMax) : "–", small: true },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{greeting(d)}, {user.name.split(" ")[0]}</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{t.title}</h1>
        </div>
        <Link href="/dashboard/upload" className="btn-primary self-start sm:self-auto">
          <FilePlus2 className="h-4 w-4" /> {t.newQuote}
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <s.icon className="h-5 w-5 text-brand-600" />
            <p className={`num mt-3 font-display font-semibold ${s.small ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
      {analyses.length > 0 && (
        <p className="mt-2 text-xs text-ink-muted">{t.extraNote}</p>
      )}

      {quotes.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Upload className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">{t.emptyTitle}</h2>
          <p className="mt-2 max-w-md text-ink-soft">{t.emptyText}</p>
          <Link href="/dashboard/upload" className="btn-primary mt-6">
            <FilePlus2 className="h-4 w-4" /> {t.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {[...groups.entries()].map(([project, list]) => {
            const comparable = list.filter((q) => q.status === "DONE");
            return (
              <section key={project}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold">
                    {project} <span className="num font-sans text-base font-normal text-ink-muted">({list.length})</span>
                  </h2>
                  {comparable.length >= 2 && (
                    <Link
                      href={`/dashboard/sammenlign?ids=${comparable.slice(0, 4).map((q) => q.id).join(",")}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                    >
                      <Columns3 className="h-4 w-4" /> {fmt(t.compareN, { n: Math.min(4, comparable.length) })}
                    </Link>
                  )}
                </div>
                <div className="space-y-3">
                  {list.map((q) => (
                    <QuoteCard key={q.id} quote={q} locked={!hasFullAccess(user, q)} d={d} intlLocale={INTL_LOCALE[locale]} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
