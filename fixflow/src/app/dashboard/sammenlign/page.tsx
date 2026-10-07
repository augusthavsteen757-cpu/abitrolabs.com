import Link from "next/link";
import type { Metadata } from "next";
import { Trophy, Eye, ShieldCheck, Lightbulb, CheckCircle2, XCircle, Columns3, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listQuotes } from "@/lib/quotes";
import { distanceKm, locatePostalCode, postalCodeFromText } from "@/lib/geo";
import { canCompare } from "@/lib/plans";
import {
  CATEGORIES,
  CHECK_KEYS,
  categoryTotals,
  parseStoredAnalysis,
  unspecifiedShare,
  worstCase,
  type QuoteAnalysis,
} from "@/lib/analysis";
import { cn, formatKr, formatPct, formatRange } from "@/lib/format";
import { Paywall } from "@/components/Paywall";
import { ComparePicker } from "@/components/ComparePicker";
import { ScoreRing } from "@/components/ScoreRing";
import { scoreLabel } from "@/lib/score";
import { getDict, getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";
import type { Dict } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).compare.metaTitle };
}

type Row = {
  id: string;
  name: string;
  a: QuoteAnalysis;
  worst: number;
  unspec: number;
  cats: Record<string, number>;
  distance: number | null;
};

/**
 * "Bedste samlede match": a transparent weighting, not advice.
 * 50 % worst-case price (lower is better), 35 % Tilbudsscore, 15 % distance (when known).
 */
function bestMatch(rows: Row[]) {
  const worsts = rows.map((r) => r.worst);
  const minW = Math.min(...worsts);
  const maxW = Math.max(...worsts);
  const dists = rows.map((r) => r.distance).filter((d): d is number => d != null);
  const useDist = dists.length === rows.length && rows.length > 1;
  const maxD = useDist ? Math.max(...dists, 1) : 1;
  const scored = rows.map((r) => {
    const price = maxW === minW ? 1 : 1 - (r.worst - minW) / (maxW - minW);
    const clarity = r.a.score.total / 100;
    const near = useDist && r.distance != null ? 1 - r.distance / maxD : 0;
    const total = useDist ? price * 0.5 + clarity * 0.35 + near * 0.15 : price * 0.6 + clarity * 0.4;
    return { r, total };
  });
  scored.sort((x, y) => y.total - x.total);
  return { best: scored[0].r, useDist };
}

function shortName(name: string | null, unknown: string) {
  return (name || unknown).replace(/\s+(ApS|A\/S|I\/S|IVS)$/i, "");
}

function buildInsights(rows: Row[], d: Dict, km: (n: number) => string): string[] {
  const t = d.compare.insight;
  const and = d.compare.and;
  const out: string[] = [];
  const cheapest = [...rows].sort((x, y) => x.a.totals.inclVat - y.a.totals.inclVat)[0];
  const clearest = [...rows].sort((x, y) => y.a.score.total - x.a.score.total)[0];
  const safest = [...rows].sort((x, y) => x.worst - y.worst)[0];

  out.push(
    cheapest.id !== clearest.id
      ? fmt(t.cheapVsClear, {
          cheap: cheapest.name,
          price: formatKr(cheapest.a.totals.inclVat),
          clear: clearest.name,
          s1: clearest.a.score.total,
          s2: cheapest.a.score.total,
          diff: formatKr(clearest.a.totals.inclVat - cheapest.a.totals.inclVat),
        })
      : fmt(t.cheapAndClear, { name: cheapest.name }),
  );
  out.push(
    safest.id !== cheapest.id
      ? fmt(t.worstCase, { cheap: cheapest.name, w1: formatKr(cheapest.worst), safe: safest.name, w2: formatKr(safest.worst) })
      : fmt(t.worstSame, { name: cheapest.name, worst: formatKr(cheapest.worst) }),
  );

  const withDist = rows.filter((r) => r.distance != null);
  if (withDist.length === rows.length) {
    const nearest = [...withDist].sort((x, y) => x.distance! - y.distance!)[0];
    const farthest = [...withDist].sort((x, y) => y.distance! - x.distance!)[0];
    if (nearest.id !== farthest.id && farthest.distance! - nearest.distance! >= 10) {
      out.push(fmt(t.distance, { near: nearest.name, d1: km(nearest.distance!), far: farthest.name, d2: km(farthest.distance!) }));
    }
  }
  for (const r of rows) {
    if (r.unspec >= 0.25) out.push(fmt(t.unspec, { pct: formatPct(r.unspec), name: r.name }));
  }
  for (const r of rows) {
    if (r.a.priceType === "overslag") out.push(fmt(t.overslag, { name: r.name }));
    else if (r.a.priceType === "uklart") out.push(fmt(t.unclearPrice, { name: r.name }));
  }
  for (const c of CATEGORIES) {
    if (c === "Diverse") continue;
    const has = rows.filter((r) => r.cats[c] > 0);
    const missing = rows.filter((r) => !(r.cats[c] > 0));
    if (has.length > 0 && missing.length > 0) {
      out.push(
        fmt(t.missingCategory, {
          category: d.labels.category[c],
          has: has.map((r) => r.name).join(and),
          missing: missing.map((r) => r.name).join(and),
        }),
      );
    }
  }
  // Sentences end with a full stop – but formatKr() already ends with "kr.".
  return out.map((x) => (x.endsWith(".") ? x : `${x}.`));
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const { locale, d } = await getI18n();
  const t = d.compare;
  const intl = INTL_LOCALE[locale];
  const km = (n: number) => fmt(t.km, { n: Math.round(n).toLocaleString(intl) });

  if (!canCompare(user)) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-up">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t.title}</h1>
        <p className="mt-2 text-ink-soft">{t.lockedIntro}</p>
        <div className="mt-8">
          <Paywall
            title={t.lockedTitle}
            text={t.lockedText}
            showSingle={false}
          />
        </div>
      </div>
    );
  }

  const quotes = (await listQuotes(user.id)).filter((q) => q.status === "DONE" && q.analysisJson);
  const items = quotes.map((q) => ({
    id: q.id,
    label: shortName(q.contractorName, d.common.unknownFirm) + (q.title ? ` – ${q.title}` : ""),
    project: q.projectName,
    total: q.totalInclVat,
  }));

  let ids = (sp.ids ?? "").split(",").filter(Boolean);
  if (ids.length === 0) {
    // Default: the project with the most analyzed quotes.
    const counts = new Map<string, string[]>();
    for (const q of quotes) counts.set(q.projectName, [...(counts.get(q.projectName) ?? []), q.id]);
    const best = [...counts.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    ids = best.length >= 2 ? best.slice(0, 4) : [];
  }
  ids = ids.slice(0, 4);

  const origin = await locatePostalCode(user.postalCode);
  const rows: Row[] = [];
  for (const q of ids.map((id) => quotes.find((x) => x.id === id))) {
    const a = q ? parseStoredAnalysis(q.analysisJson) : null;
    if (!q || !a) continue;
    const place = origin ? await locatePostalCode(postalCodeFromText(a.contractor.address)) : null;
    rows.push({
      id: q.id,
      name: shortName(a.contractor.name, d.common.unknownFirm),
      a,
      worst: worstCase(a),
      unspec: unspecifiedShare(a),
      cats: categoryTotals(a),
      distance: origin && place ? distanceKm(origin, place) : null,
    });
  }

  const header = (
    <div>
      <h1 className="text-3xl font-semibold sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-ink-soft">{t.intro}</p>
    </div>
  );

  if (quotes.length < 2) {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="card mt-8 flex flex-col items-center px-6 py-14 text-center">
          <Columns3 className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-semibold">{t.needTwoTitle}</h2>
          <p className="mt-2 max-w-md text-ink-soft">{t.needTwoText}</p>
          <Link href="/dashboard/upload" className="btn-primary mt-6">{t.upload}</Link>
        </div>
      </div>
    );
  }

  const pickerItems = items;
  if (rows.length < 2) {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="mt-8">
          <ComparePicker items={pickerItems} selected={rows.map((r) => r.id)} />
        </div>
      </div>
    );
  }

  const cheapest = [...rows].sort((x, y) => x.a.totals.inclVat - y.a.totals.inclVat)[0];
  const clearest = [...rows].sort((x, y) => y.a.score.total - x.a.score.total)[0];
  const safest = [...rows].sort((x, y) => x.worst - y.worst)[0];
  const insights = buildInsights(rows, d, km);
  const scoreLbl = (r: Row) => scoreLabel(r.a.score.total, d.score);
  const match = bestMatch(rows);

  const winners = [
    { icon: Trophy, label: t.cheapest, row: cheapest, value: formatKr(cheapest.a.totals.inclVat), sub: t.inclVat },
    { icon: Eye, label: t.clearest, row: clearest, value: `${clearest.a.score.total}/100`, sub: scoreLbl(clearest) },
    { icon: ShieldCheck, label: t.safest, row: safest, value: formatKr(safest.worst), sub: t.worstSub },
  ];

  const usedCats = CATEGORIES.filter((c) => rows.some((r) => r.cats[c] > 0));
  const cell = "px-4 py-3 align-top";

  return (
    <div className="animate-fade-up">
      {header}

      <details className="mt-6">
        <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
          {fmt(t.change, { n: rows.length })}
        </summary>
        <div className="mt-3">
          <ComparePicker items={pickerItems} selected={rows.map((r) => r.id)} />
        </div>
      </details>

      {rows.some((r) => (r.a.currency ?? "DKK") !== "DKK") && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {fmt(t.currencyWarning, { list: [...new Set(rows.map((r) => r.a.currency ?? "DKK"))].join(", ") })}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-brand-700 bg-brand-900 p-5 text-white shadow-lift sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-300">
          <Sparkles className="h-4 w-4" /> {t.bestMatch}
        </p>
        <p className="mt-2 font-display text-2xl font-semibold text-white">{match.best.name}</p>
        <p className="mt-1 text-sm text-brand-100">
          {fmt(t.bestLine, { price: formatKr(match.best.a.totals.inclVat), score: match.best.a.score.total, worst: formatKr(match.best.worst) })}
          {match.best.distance != null && fmt(t.bestDistance, { km: km(match.best.distance) })}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-brand-200">
          {fmt(t.bestExplain, { p: match.useDist ? 50 : 60, c: match.useDist ? 35 : 40, dist: match.useDist ? t.bestExplainDist : "" })}
          {!origin && (
            <>
              {" "}
              <Link href="/dashboard/konto#postnummer" className="font-semibold text-white underline">{t.addPostal}</Link> {t.addPostalTail}
            </>
          )}
        </p>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {winners.map((w) => (
          <div key={w.label} className="card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
              <w.icon className="h-4 w-4" /> {w.label}
            </p>
            <p className="mt-3 truncate font-semibold">{w.row.name}</p>
            <p className="num mt-1 font-display text-2xl font-semibold">{w.value}</p>
            <p className="text-sm text-ink-muted">{w.sub}</p>
          </div>
        ))}
      </div>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Lightbulb className="h-5 w-5 text-amber-500" /> {t.insightsTitle}
        </h2>
        <ul className="mt-4 space-y-3">
          {insights.map((line, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-left">
                <th className="sticky left-0 z-10 w-48 bg-paper px-4 py-3 font-medium text-ink-muted" scope="col">
                  <span className="sr-only">{t.point}</span>
                </th>
                {rows.map((r) => (
                  <th key={r.id} scope="col" className="px-4 py-3">
                    <Link href={`/dashboard/tilbud/${r.id}`} className="flex items-center gap-3 hover:underline">
                      <ScoreRing score={r.a.score.total} size={40} />
                      <span className="font-semibold text-ink">{r.name}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <CompareRow label={t.rowPrice} rows={rows} render={(r) => <strong className="num">{formatKr(r.a.totals.inclVat)}</strong>} best={cheapest.id} cell={cell} />
              <CompareRow label={t.rowScore} rows={rows} render={(r) => <span className="num">{r.a.score.total} · {scoreLbl(r)}</span>} best={clearest.id} cell={cell} />
              {origin && (
                <CompareRow
                  label={t.rowDistance}
                  rows={rows}
                  render={(r) => (r.distance != null ? <span className="num">{km(r.distance)}</span> : <span className="text-ink-muted">{t.unknown}</span>)}
                  cell={cell}
                />
              )}
              <CompareRow label={t.rowPriceType} rows={rows} render={(r) => d.labels.priceType[r.a.priceType]} cell={cell} />
              <CompareRow
                label={t.rowExtra}
                rows={rows}
                render={(r) => <span className="num">{formatRange(r.a.extraCostRisk.min * 1.25, r.a.extraCostRisk.max * 1.25)}</span>}
                cell={cell}
              />
              <CompareRow label={t.rowWorst} rows={rows} render={(r) => <strong className="num">{formatKr(r.worst)}</strong>} best={safest.id} cell={cell} />
              <CompareRow
                label={t.rowUnspec}
                rows={rows}
                render={(r) => <span className={cn("num", r.unspec >= 0.25 && "font-semibold text-red-700")}>{formatPct(r.unspec)}</span>}
                cell={cell}
              />
              <CompareRow
                label={t.rowSerious}
                rows={rows}
                render={(r) => {
                  const n = r.a.flags.filter((f) => f.severity === "high").length;
                  return <span className={cn("num", n > 0 && "font-semibold text-red-700")}>{n}</span>;
                }}
                cell={cell}
              />
              <tr className="bg-paper/60">
                <th colSpan={rows.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {t.sectionCategories}
                </th>
              </tr>
              {usedCats.map((c) => (
                <CompareRow
                  key={c}
                  label={d.labels.category[c]}
                  rows={rows}
                  render={(r) =>
                    r.cats[c] > 0 ? (
                      <span className="num">{formatKr(r.cats[c])}</span>
                    ) : c === "Diverse" ? (
                      <span className="text-ink-muted">–</span>
                    ) : (
                      <span className="font-medium text-red-700">{t.notStated}</span>
                    )
                  }
                  cell={cell}
                />
              ))}
              <tr className="bg-paper/60">
                <th colSpan={rows.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {t.sectionChecks}
                </th>
              </tr>
              {CHECK_KEYS.map((k) => (
                <CompareRow
                  key={k}
                  label={d.labels.check[k]}
                  rows={rows}
                  render={(r) =>
                    r.a.checks.find((c) => c.key === k)?.present ? (
                      <CheckCircle2 className="h-5 w-5 text-brand-600" aria-label={d.quote.yes} />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" aria-label={d.quote.no} />
                    )
                  }
                  cell={cell}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 text-xs text-ink-muted">
        {t.footnote}
      </p>
    </div>
  );
}

function CompareRow({
  label,
  rows,
  render,
  best,
  cell,
}: {
  label: string;
  rows: Row[];
  render: (r: Row) => React.ReactNode;
  best?: string;
  cell: string;
}) {
  return (
    <tr>
      <th scope="row" className={cn(cell, "sticky left-0 z-10 bg-white text-left font-medium text-ink-soft")}>
        {label}
      </th>
      {rows.map((r) => (
        <td key={r.id} className={cn(cell, best === r.id && "bg-brand-50/70")}>
          {render(r)}
        </td>
      ))}
    </tr>
  );
}
