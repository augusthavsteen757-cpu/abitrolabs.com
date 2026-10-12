"use client";

import { useId, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";

/** "Har du en kode?" – redeems a partner code for free analyses. */
export function RedeemCode({ initialCode = "" }: { initialCode?: string }) {
  const { d } = useI18n();
  const t = d.code;
  const inputId = useId();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || d.common.somethingWrong);
      setMsg({ ok: true, text: fmt(json.credits === 1 ? t.doneOne : t.doneOther, { n: json.credits }) });
      setCode("");
      setTimeout(() => window.location.assign("/dashboard/konto"), 1500);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof TypeError ? d.common.noConnection : err instanceof Error ? err.message : d.common.somethingWrong });
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 p-5 sm:p-6" data-testid="redeem-code">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Gift className="h-5 w-5 text-brand-600" /> {t.title}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{t.text}</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">{t.label}</label>
        <input
          id={inputId}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={64}
          placeholder={t.placeholder}
          className="input min-w-0 flex-1 uppercase"
          data-testid="code-input"
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn-primary" data-testid="code-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.button}
        </button>
      </form>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "mt-3 text-sm text-brand-700" : "mt-3 text-sm text-red-700"}>
          {msg.text}
        </p>
      )}
    </section>
  );
}
