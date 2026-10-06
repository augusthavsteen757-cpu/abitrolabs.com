import Link from "next/link";
import type { Metadata } from "next";
import { FilePlus2, FileSearch, Gauge, AlertTriangle, Wallet, Columns3, Upload } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listQuotes } from "@/lib/quotes";
import { parseStoredAnalysis, redactForFree } from "@/lib/analysis";
import { formatRange } from "@/lib/format";
import { hasFullAccess } from "@/lib/plans";
import { QuoteCard } from "@/components/QuoteCard";

export const metadata: Metadata = { title: "Oversigt" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("da-DK", { hour: "numeric", hour12: false, timeZone: "Europe/Copenhagen" }).format(new Date()),
  );
  if (hour < 5) return "Godnat";
  if (hour < 10) return "Godmorgen";
  if (hour < 18) return "Goddag";
  return "Godaften";
}

export default async function DashboardPage() {
  const user = await requireUser();
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
    { icon: FileSearch, label: "Tilbud analyseret", value: String(done.length) },
    { icon: Gauge, label: "Gns. tilbudsscore", value: avgScore != null ? `${avgScore}` : "–" },
    { icon: AlertTriangle, label: "Alvorlige fund", value: String(seriousFlags) },
    { icon: Wallet, label: "Mulige ekstraudgifter", value: analyses.length ? formatRange(extraMin, extraMax) : "–", small: true },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{greeting()}, {user.name.split(" ")[0]}</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Dine tilbud</h1>
        </div>
        <Link href="/dashboard/upload" className="btn-primary self-start sm:self-auto">
          <FilePlus2 className="h-4 w-4" /> Analysér nyt tilbud
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
        <p className="mt-2 text-xs text-ink-muted">Ekstraudgifter er vores skøn inkl. moms, samlet for alle dine tilbud.</p>
      )}

      {quotes.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Upload className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">Upload dit første tilbud</h2>
          <p className="mt-2 max-w-md text-ink-soft">
            Det tager under to minutter. Du får tilbuddet forklaret på almindeligt dansk – og ved præcis, hvad du skal
            spørge om.
          </p>
          <Link href="/dashboard/upload" className="btn-primary mt-6">
            <FilePlus2 className="h-4 w-4" /> Kom i gang
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
                      <Columns3 className="h-4 w-4" /> Sammenlign {Math.min(4, comparable.length)} tilbud
                    </Link>
                  )}
                </div>
                <div className="space-y-3">
                  {list.map((q) => (
                    <QuoteCard key={q.id} quote={q} locked={!hasFullAccess(user, q)} />
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
