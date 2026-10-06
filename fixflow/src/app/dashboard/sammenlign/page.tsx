import Link from "next/link";
import type { Metadata } from "next";
import { Trophy, Eye, ShieldCheck, Lightbulb, CheckCircle2, XCircle, Columns3 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listQuotes } from "@/lib/quotes";
import { canCompare } from "@/lib/plans";
import {
  CATEGORIES,
  CHECK_KEYS,
  CHECK_LABELS,
  PRICE_TYPE_LABELS,
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

export const metadata: Metadata = { title: "Sammenlign" };

type Row = { id: string; name: string; a: QuoteAnalysis; worst: number; unspec: number; cats: Record<string, number> };

function shortName(name: string | null) {
  return (name || "Ukendt firma").replace(/\s+(ApS|A\/S|I\/S|IVS)$/i, "");
}

function buildInsights(rows: Row[]): string[] {
  const out: string[] = [];
  const cheapest = [...rows].sort((x, y) => x.a.totals.inclVat - y.a.totals.inclVat)[0];
  const clearest = [...rows].sort((x, y) => y.a.score.total - x.a.score.total)[0];
  const safest = [...rows].sort((x, y) => x.worst - y.worst)[0];

  if (cheapest.id !== clearest.id) {
    out.push(
      `${cheapest.name} er billigst (${formatKr(cheapest.a.totals.inclVat)}), men ${clearest.name} har det mest gennemsigtige tilbud (score ${clearest.a.score.total} mod ${cheapest.a.score.total}). Prisforskellen er ${formatKr(clearest.a.totals.inclVat - cheapest.a.totals.inclVat)}.`,
    );
  } else {
    out.push(`${cheapest.name} er både billigst og mest gennemsigtigt. Det er et godt udgangspunkt.`);
  }

  if (safest.id !== cheapest.id) {
    out.push(
      `Regner man de mulige ekstraudgifter med, kan ${cheapest.name} i værste fald ende på ${formatKr(cheapest.worst)}, mens ${safest.name} højst ender på ${formatKr(safest.worst)}. Den laveste pris er ikke nødvendigvis den billigste løsning.`,
    );
  } else {
    out.push(`${cheapest.name} er også billigst i værste fald (${formatKr(cheapest.worst)} inkl. mulige ekstraudgifter).`);
  }

  for (const r of rows) {
    if (r.unspec >= 0.25) {
      out.push(`${formatPct(r.unspec)} af beløbet hos ${r.name} ligger i poster, der ikke er tydeligt beskrevet. Bed om en specifikation.`);
    }
  }

  for (const r of rows) {
    if (r.a.priceType === "overslag") {
      out.push(`${r.name} har givet et overslag. Det er ikke bindende, så prisen kan blive højere end de andre tilbud viser.`);
    } else if (r.a.priceType === "uklart") {
      out.push(`Det fremgår ikke, om prisen fra ${r.name} er fast. Få det bekræftet skriftligt.`);
    }
  }

  for (const c of CATEGORIES) {
    if (c === "Diverse") continue;
    const has = rows.filter((r) => r.cats[c] > 0);
    const missing = rows.filter((r) => !(r.cats[c] > 0));
    if (has.length > 0 && missing.length > 0) {
      out.push(
        `${c} står i tilbuddet fra ${has.map((r) => r.name).join(" og ")}, men ikke hos ${missing.map((r) => r.name).join(" og ")}. Spørg, om det er med i prisen.`,
      );
    }
  }
  // formatKr() ends with "kr." – avoid "kr.." at the end of sentences.
  return out.map((t) => t.replace(/kr\.\./g, "kr."));
}

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const user = await requireUser();

  if (!canCompare(user)) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-up">
        <h1 className="text-3xl font-semibold sm:text-4xl">Sammenlign tilbud</h1>
        <p className="mt-2 text-ink-soft">Se op til 4 tilbud side om side – pris, risiko og hvad der mangler hvor.</p>
        <div className="mt-8">
          <Paywall
            title="Sammenligning er en del af Pro"
            text="Med Pro kan du sammenligne op til 4 tilbud og se, hvilket der er billigst – også i værste fald."
            showSingle={false}
          />
        </div>
      </div>
    );
  }

  const quotes = (await listQuotes(user.id)).filter((q) => q.status === "DONE" && q.analysisJson);
  const items = quotes.map((q) => ({
    id: q.id,
    label: shortName(q.contractorName) + (q.title ? ` – ${q.title}` : ""),
    project: q.projectName,
    total: q.totalInclVat,
  }));

  let ids = (searchParams.ids ?? "").split(",").filter(Boolean);
  if (ids.length === 0) {
    // Default: the project with the most analyzed quotes.
    const counts = new Map<string, string[]>();
    for (const q of quotes) counts.set(q.projectName, [...(counts.get(q.projectName) ?? []), q.id]);
    const best = [...counts.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    ids = best.length >= 2 ? best.slice(0, 4) : [];
  }
  ids = ids.slice(0, 4);

  const rows: Row[] = ids
    .map((id) => quotes.find((q) => q.id === id))
    .filter((q) => q != null)
    .flatMap((q) => {
      const a = parseStoredAnalysis(q.analysisJson);
      if (!a) return [];
      return [{ id: q.id, name: shortName(a.contractor.name), a, worst: worstCase(a), unspec: unspecifiedShare(a), cats: categoryTotals(a) }];
    });

  const header = (
    <div>
      <h1 className="text-3xl font-semibold sm:text-4xl">Sammenlign tilbud</h1>
      <p className="mt-2 text-ink-soft">Se tilbuddene side om side – og hvad den laveste pris egentlig dækker.</p>
    </div>
  );

  if (quotes.length < 2) {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="card mt-8 flex flex-col items-center px-6 py-14 text-center">
          <Columns3 className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-semibold">Du skal have mindst 2 analyserede tilbud</h2>
          <p className="mt-2 max-w-md text-ink-soft">Upload flere tilbud på samme opgave, så kan du sammenligne dem her.</p>
          <Link href="/dashboard/upload" className="btn-primary mt-6">Upload tilbud</Link>
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
  const insights = buildInsights(rows);

  const winners = [
    { icon: Trophy, label: "Lavest pris", row: cheapest, value: formatKr(cheapest.a.totals.inclVat), sub: "inkl. moms" },
    { icon: Eye, label: "Mest gennemsigtigt", row: clearest, value: `${clearest.a.score.total}/100`, sub: clearest.a.score.label },
    { icon: ShieldCheck, label: "Lavest værste scenarie", row: safest, value: formatKr(safest.worst), sub: "pris + mulige ekstraudgifter" },
  ];

  const usedCats = CATEGORIES.filter((c) => rows.some((r) => r.cats[c] > 0));
  const cell = "px-4 py-3 align-top";

  return (
    <div className="animate-fade-up">
      {header}

      <details className="mt-6">
        <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
          Skift tilbud ({rows.length} valgt)
        </summary>
        <div className="mt-3">
          <ComparePicker items={pickerItems} selected={rows.map((r) => r.id)} />
        </div>
      </details>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
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
          <Lightbulb className="h-5 w-5 text-amber-500" /> Det bør du vide
        </h2>
        <ul className="mt-4 space-y-3">
          {insights.map((t, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {t}
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
                  <span className="sr-only">Punkt</span>
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
              <CompareRow label="Pris inkl. moms" rows={rows} render={(r) => <strong className="num">{formatKr(r.a.totals.inclVat)}</strong>} best={cheapest.id} cell={cell} />
              <CompareRow label="Tilbudsscore" rows={rows} render={(r) => <span className="num">{r.a.score.total} · {r.a.score.label}</span>} best={clearest.id} cell={cell} />
              <CompareRow label="Prisform" rows={rows} render={(r) => PRICE_TYPE_LABELS[r.a.priceType]} cell={cell} />
              <CompareRow
                label="Mulige ekstraudgifter"
                rows={rows}
                render={(r) => <span className="num">{formatRange(r.a.extraCostRisk.min * 1.25, r.a.extraCostRisk.max * 1.25)}</span>}
                cell={cell}
              />
              <CompareRow label="Værste scenarie" rows={rows} render={(r) => <strong className="num">{formatKr(r.worst)}</strong>} best={safest.id} cell={cell} />
              <CompareRow
                label="Uspecificeret andel"
                rows={rows}
                render={(r) => <span className={cn("num", r.unspec >= 0.25 && "font-semibold text-red-700")}>{formatPct(r.unspec)}</span>}
                cell={cell}
              />
              <CompareRow
                label="Alvorlige fund"
                rows={rows}
                render={(r) => {
                  const n = r.a.flags.filter((f) => f.severity === "high").length;
                  return <span className={cn("num", n > 0 && "font-semibold text-red-700")}>{n}</span>;
                }}
                cell={cell}
              />
              <tr className="bg-paper/60">
                <th colSpan={rows.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Beløb pr. kategori (ekskl. moms)
                </th>
              </tr>
              {usedCats.map((c) => (
                <CompareRow
                  key={c}
                  label={c}
                  rows={rows}
                  render={(r) =>
                    r.cats[c] > 0 ? (
                      <span className="num">{formatKr(r.cats[c])}</span>
                    ) : c === "Diverse" ? (
                      <span className="text-ink-muted">–</span>
                    ) : (
                      <span className="font-medium text-red-700">Ikke angivet</span>
                    )
                  }
                  cell={cell}
                />
              ))}
              <tr className="bg-paper/60">
                <th colSpan={rows.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Står det i tilbuddet?
                </th>
              </tr>
              {CHECK_KEYS.map((k) => (
                <CompareRow
                  key={k}
                  label={CHECK_LABELS[k]}
                  rows={rows}
                  render={(r) =>
                    r.a.checks.find((c) => c.key === k)?.present ? (
                      <CheckCircle2 className="h-5 w-5 text-brand-600" aria-label="Ja" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" aria-label="Nej" />
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
        Værste scenarie = pris inkl. moms + den højeste skønnede ekstraudgift inkl. moms. Skønnene er vejledende.
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
