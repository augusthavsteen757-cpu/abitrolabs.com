"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, KeyRound, LogOut, Download, Trash2 } from "lucide-react";

function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(url: string, body: unknown, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Det lykkedes ikke.");
      setMsg({ ok: true, text: okText });
      return json;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Det lykkedes ikke." });
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, msg, run };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-brand-700" : "text-red-700"}`}>
      {msg.text}
    </p>
  );
}

export function AccountSettings({ postalCode }: { postalCode: string }) {
  const router = useRouter();
  const postal = useAction();
  const pw = useAction();
  const out = useAction();
  const del = useAction();
  const [pc, setPc] = useState(postalCode);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [delPw, setDelPw] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="mt-10 space-y-5">
      <h2 className="text-xl font-semibold">Indstillinger og data</h2>

      <form
        id="postnummer"
        className="card scroll-mt-24 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await postal.run("/api/account/postal", { postalCode: pc }, "Postnummer gemt.");
          if (r) router.refresh();
        }}
      >
        <label htmlFor="pc" className="flex items-center gap-2 font-semibold">
          <MapPin className="h-4 w-4 text-brand-600" /> Dit postnummer
        </label>
        <p className="mt-1 text-sm text-ink-muted">Bruges til at finde håndværkere i nærheden og vise afstand i sammenligningen.</p>
        <div className="mt-3 flex gap-2">
          <input
            id="pc"
            value={pc}
            onChange={(e) => setPc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="postal-code"
            className="input max-w-[140px]"
            placeholder="Fx 4000"
          />
          <button type="submit" disabled={postal.busy} className="btn-secondary">
            {postal.busy && <Loader2 className="h-4 w-4 animate-spin" />} Gem
          </button>
        </div>
        <Msg msg={postal.msg} />
      </form>

      <form
        className="card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await pw.run("/api/account/password", { current, next }, "Adgangskoden er skiftet. Andre enheder er logget ud.");
          if (r) {
            setCurrent("");
            setNext("");
          }
        }}
      >
        <p className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-brand-600" /> Skift adgangskode
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cur" className="label">Nuværende</label>
            <input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="new" className="label">Ny (mindst 10 tegn)</label>
            <input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="input" />
          </div>
        </div>
        <button type="submit" disabled={pw.busy || !current || !next} className="btn-secondary mt-3">
          {pw.busy && <Loader2 className="h-4 w-4 animate-spin" />} Skift adgangskode
        </button>
        <Msg msg={pw.msg} />
      </form>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <LogOut className="h-4 w-4 text-brand-600" /> Log ud alle steder
          </p>
          <p className="mt-1 text-sm text-ink-muted">Hvis du har været logget ind på en computer, du ikke har adgang til mere.</p>
          <button
            type="button"
            disabled={out.busy}
            className="btn-secondary mt-3"
            onClick={async () => {
              if (await out.run("/api/account/logout-all", {}, "Du er logget ud overalt.")) window.location.assign("/login");
            }}
          >
            Log ud alle steder
          </button>
          <Msg msg={out.msg} />
        </div>
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Download className="h-4 w-4 text-brand-600" /> Hent dine data
          </p>
          <p className="mt-1 text-sm text-ink-muted">Alle dine oplysninger, analyser og beskeder som en fil (JSON).</p>
          <a href="/api/account/export" className="btn-secondary mt-3">Hent mine data</a>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <p className="flex items-center gap-2 font-semibold text-red-800">
          <Trash2 className="h-4 w-4" /> Slet konto
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Sletter din konto, alle tilbud, filer og beskeder med det samme. Et evt. Pro-abonnement opsiges. Betalinger
          gemmes anonymt i 5 år, fordi bogføringsloven kræver det.
        </p>
        {!confirmDelete ? (
          <button type="button" className="btn mt-3 border border-red-300 bg-white text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
            Slet min konto
          </button>
        ) : (
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await del.run("/api/account/delete", { password: delPw }, "Kontoen er slettet.")) window.location.assign("/");
            }}
          >
            <label htmlFor="delpw" className="sr-only">Adgangskode</label>
            <input
              id="delpw"
              type="password"
              autoComplete="current-password"
              placeholder="Skriv din adgangskode for at bekræfte"
              value={delPw}
              onChange={(e) => setDelPw(e.target.value)}
              className="input sm:max-w-xs"
            />
            <button type="submit" disabled={del.busy || !delPw} className="btn bg-red-600 text-white hover:bg-red-700">
              {del.busy && <Loader2 className="h-4 w-4 animate-spin" />} Slet alt permanent
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>Fortryd</button>
          </form>
        )}
        <Msg msg={del.msg} />
      </div>
    </section>
  );
}
