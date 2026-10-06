"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, MapPin, ExternalLink, Info, Send, Columns3 } from "lucide-react";
import { CopyButton } from "./QuoteActions";
import { cn } from "@/lib/format";

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

const km = (n: number) => n.toLocaleString("da-DK", { maximumFractionDigits: 1 });

export function FindContractors({
  trades,
  initialPostalCode,
  customerName,
  demo,
}: {
  trades: { key: string; label: string }[];
  initialPostalCode: string;
  customerName: string;
  demo: boolean;
}) {
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
    if (!/^\d{4}$/.test(postalCode)) return setError("Skriv dit postnummer med 4 cifre.");
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ trade, postalCode, radius });
      const res = await fetch(`/api/contractors?${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Søgningen mislykkedes.");
      setResults(json.results);
      setPlace(`${json.origin.postalCode} ${json.origin.name}`);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Søgningen mislykkedes.");
    } finally {
      setBusy(false);
    }
  }

  const tradeLabel = trades.find((t) => t.key === trade)?.label ?? "";
  const request = useMemo(() => {
    const desc = project.trim() || "[Beskriv opgaven: hvad skal laves, størrelse i m², nuværende stand]";
    const time = when.trim() || "[ønsket tidspunkt]";
    return `Hej\n\nJeg søger tilbud på følgende opgave (${tradeLabel.toLowerCase()}) i ${place ?? postalCode}:\n\n${desc}\n\nØnsket udførelse: ${time}.\n\nFor at jeg kan sammenligne tilbuddene, vil jeg gerne have:\n• En fast pris eller et bindende tilbud (ikke et overslag)\n• Specificerede poster med mængder, materialer (mærke/type) og priser ekskl. og inkl. moms\n• Hvad der er med af kørsel, stillads/lift, oprydning og bortskaffelse\n• Tidsplan med start og aflevering\n• Betalingsplan – gerne rater efter udført arbejde\n• Timepris for eventuelt ekstraarbejde, og hvordan uforudsete forhold aftales\n• Garanti og forsikring (og om I er med i en ankenævns- eller garantiordning)\n• CVR-nummer, og hvor længe tilbuddet gælder (gerne mindst 30 dage)\n\nI er velkomne til at komme forbi og se opgaven.\n\nVenlig hilsen\n${customerName}`;
  }, [project, when, tradeLabel, place, postalCode, customerName]);

  const chosen = results?.filter((r) => selected.includes(r.id)) ?? [];

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="card grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end sm:p-6">
        <div>
          <label htmlFor="trade" className="label">Fag</label>
          <select id="trade" value={trade} onChange={(e) => setTrade(e.target.value)} className="input">
            {trades.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="postal" className="label">Dit postnummer</label>
          <input
            id="postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="postal-code"
            className="input"
            placeholder="Fx 4000"
          />
        </div>
        <div>
          <label htmlFor="radius" className="label">Afstand</label>
          <select id="radius" value={radius} onChange={(e) => setRadius(e.target.value)} className="input">
            {["10", "25", "50", "100"].map((r) => (
              <option key={r} value={r}>Inden for {r} km</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-[46px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Søg
        </button>
      </form>

      {demo && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Demo:</strong> Firmaerne nedenfor er fiktive. Når appen er koblet til CVR-registret, vises rigtige,
            aktive firmaer i dit område.
          </span>
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {results && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">
              {results.length} {results.length === 1 ? "firma" : "firmaer"} nær {place}
            </h2>
            <p className="text-sm text-ink-muted">Sorteret efter afstand. Vælg dem, du vil bede om tilbud.</p>
          </div>
          {results.length === 0 ? (
            <p className="card mt-4 p-5 text-ink-soft">Ingen firmaer fundet. Prøv en større afstand eller et andet fag.</p>
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
                          <MapPin className="h-3.5 w-3.5" /> {f.approxDistance ? "ca. " : ""}{km(f.distanceKm)} km
                        </span>
                        <span>· {f.postalCode} {f.city}</span>
                        {f.foundedYear && <span>· siden {f.foundedYear}</span>}
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
            <Send className="h-5 w-5 text-brand-600" /> Bed om tilbud
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Send den samme besked til {chosen.length > 0 ? `de ${chosen.length} valgte firmaer` : "de firmaer, du vælger"}. Så
            får du tilbud, der er nemme at sammenligne – og som scorer højt i FixFlow.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label htmlFor="project" className="label">Opgaven</label>
              <textarea
                id="project"
                rows={3}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                maxLength={1000}
                className="input"
                placeholder="Fx Totalrenovering af badeværelse på ca. 6 m² i parcelhus fra 1975. Nye fliser, gulvvarme, væghængt toilet."
              />
            </div>
            <div>
              <label htmlFor="when" className="label">Hvornår</label>
              <input id="when" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={100} className="input" placeholder="Fx i løbet af foråret" />
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink-soft">Din besked</p>
              <CopyButton text={request} />
            </div>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{request}</p>
          </div>
          {chosen.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink-soft">Send til</p>
              <ul className="mt-2 space-y-1 text-sm">
                {chosen.map((f) => (
                  <li key={f.id} className="select-all">
                    <strong>{f.name}</strong>
                    {f.email ? ` – ${f.email}` : f.phone ? ` – ${f.phone}` : " – find kontaktoplysninger på firmaets hjemmeside eller CVR-siden"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <Columns3 className="h-4 w-4 text-brand-600" /> Når tilbuddene kommer:
            <Link href="/dashboard/upload" className="font-semibold text-brand-700 hover:underline">upload dem med samme projektnavn</Link>
            og sammenlign dem – inkl. afstand og værste scenarie.
          </p>
        </section>
      )}
    </div>
  );
}
