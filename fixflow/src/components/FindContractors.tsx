"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, MapPin, ExternalLink, Info, Send, Columns3 } from "lucide-react";
import { CopyButton } from "./QuoteActions";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";
import { da } from "@/i18n/dict/da";

type Firm = {
  id: string;
  name: string;
  cvr: string | null;
  address: string;
  postalCode: string;
  city: string;
  distanceKm: number;
  approxDistance: boolean;
  phone: string | null;
  email: string | null;
  foundedYear: number | null;
  companyForm: string | null;
  source: "cvr" | "demo";
};


export function FindContractors({
  trades,
  initialPostalCode,
  customerName,
  demo,
}: {
  /** Each trade with its label in the viewer's language and in Danish (for the request to Danish firms). */
  trades: { key: string; label: string; labelDa: string }[];
  initialPostalCode: string;
  customerName: string;
  demo: boolean;
}) {
  const { d, locale } = useI18n();
  const t = d.find;
  const intl = INTL_LOCALE[locale];
  const [trade, setTrade] = useState(trades[0].key);
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [radius, setRadius] = useState("25");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Firm[] | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [project, setProject] = useState("");
  const [when, setWhen] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(postalCode)) return setError(t.errPostal);
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ trade, postalCode, radius });
      const res = await fetch(`/api/contractors?${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t.errFailed);
      setResults(json.results);
      setPlace(`${json.origin.postalCode} ${json.origin.name}`);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errFailed);
    } finally {
      setBusy(false);
    }
  }

  // The request goes to Danish firms, so it is always written in Danish.
  const tradeLabelDa = trades.find((x) => x.key === trade)?.labelDa ?? "";
  const request = useMemo(() => {
    const q = da.quoteRequest;
    const desc = project.trim() || q.descFallback;
    const time = when.trim() || q.whenFallback;
    return [
      fmt(q.intro, { trade: tradeLabelDa.toLowerCase(), place: place ?? postalCode }),
      desc,
      fmt(q.when, { when: time }),
      `${q.listIntro}\n${q.list.map((l) => `• ${l}`).join("\n")}`,
      q.visit,
      `${q.regards}\n${customerName}`,
    ].join("\n\n");
  }, [project, when, tradeLabelDa, place, postalCode, customerName]);

  const chosen = results?.filter((r) => selected.includes(r.id)) ?? [];

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="card grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end sm:p-6">
        <div>
          <label htmlFor="trade" className="label">{t.trade}</label>
          <select id="trade" value={trade} onChange={(e) => setTrade(e.target.value)} className="input">
            {trades.map((x) => (
              <option key={x.key} value={x.key}>{x.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="postal" className="label">{t.postal}</label>
          <input
            id="postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="postal-code"
            className="input"
            placeholder={t.postalPlaceholder}
          />
        </div>
        <div>
          <label htmlFor="radius" className="label">{t.radius}</label>
          <select id="radius" value={radius} onChange={(e) => setRadius(e.target.value)} className="input">
            {["10", "25", "50", "100"].map((r) => (
              <option key={r} value={r}>{fmt(t.within, { n: r })}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-[46px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {t.search}
        </button>
      </form>

      {demo && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{t.demo}</strong> {t.demoText}
          </span>
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {results && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">
              {fmt(results.length === 1 ? t.resultsOne : t.resultsOther, { n: results.length, place: place ?? "" })}
            </h2>
            <p className="text-sm text-ink-muted">{t.sorted}</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{t.source}</p>
          {results.length === 0 ? (
            <p className="card mt-4 p-5 text-ink-soft">{t.none}</p>
          ) : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {results.map((f) => {
                const on = selected.includes(f.id);
                return (
                  <li key={f.id} className={cn("card flex gap-3 p-4", on && "border-brand-500 ring-2 ring-brand-500/20")}>
                    <input
                      type="checkbox"
                      id={`f-${f.id}`}
                      checked={on}
                      onChange={() => setSelected((s) => (on ? s.filter((x) => x !== f.id) : [...s, f.id]))}
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
                    />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`f-${f.id}`} className="block cursor-pointer font-semibold">{f.name}</label>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {f.approxDistance ? t.approx : ""}{f.distanceKm.toLocaleString(intl, { maximumFractionDigits: 1 })} km
                        </span>
                        <span>· {f.postalCode} {f.city}</span>
                        {f.foundedYear && <span>· {fmt(t.since, { year: f.foundedYear })}</span>}
                      </p>
                      {(f.phone || f.email) && (
                        <p className="mt-1 select-all text-sm text-ink-soft">{[f.phone, f.email].filter(Boolean).join(" · ")}</p>
                      )}
                      {f.cvr && (
                        <a
                          href={`https://datacvr.virk.dk/enhed/virksomhed/${f.cvr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                        >
                          CVR {f.cvr} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {results && results.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Send className="h-5 w-5 text-brand-600" /> {t.requestTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {chosen.length > 0 ? fmt(t.requestIntroSelected, { n: chosen.length }) : t.requestIntro}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label htmlFor="project" className="label">{t.project}</label>
              <textarea
                id="project"
                rows={3}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                maxLength={1000}
                className="input"
                placeholder={t.projectPlaceholder}
              />
            </div>
            <div>
              <label htmlFor="when" className="label">{t.when}</label>
              <input id="when" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={100} className="input" placeholder={t.whenPlaceholder} />
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink-soft">{t.yourMessage}</p>
              <CopyButton text={request} />
            </div>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{request}</p>
            {locale !== "da" && <p className="mt-3 text-xs text-ink-muted">{t.requestLanguageNote}</p>}
          </div>
          {chosen.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink-soft">{t.sendTo}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {chosen.map((f) => (
                  <li key={f.id} className="select-all">
                    <strong>{f.name}</strong>
                    {f.email ? ` – ${f.email}` : f.phone ? ` – ${f.phone}` : ` – ${t.noContact}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <Columns3 className="h-4 w-4 text-brand-600" /> {t.whenQuotesArrive}
            <Link href="/dashboard/upload" className="font-semibold text-brand-700 hover:underline">{t.uploadSameProject}</Link>
            {t.andCompare}
          </p>
        </section>
      )}
    </div>
  );
}
