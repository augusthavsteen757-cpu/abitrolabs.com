"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Lets a user flag a wrong analysis so a person can look at it (human oversight of the AI). */
export function ReportAnalysis({ quoteId }: { quoteId: string }) {
  const { d } = useI18n();
  const t = d.quote;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || d.common.somethingWrong);
      setState({ ok: true, msg: t.reportSent });
      setText("");
    } catch (err) {
      setState({ ok: false, msg: err instanceof Error ? err.message : d.common.noConnection });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft underline hover:text-ink" data-testid="report-open">
        <Flag className="h-3.5 w-3.5" /> {t.reportLink}
      </button>
    );
  }
  return (
    <form onSubmit={send} className="mt-2 max-w-xl rounded-xl border border-line bg-white p-4">
      <label htmlFor="report-text" className="text-sm text-ink-soft">{t.reportText}</label>
      <textarea
        id="report-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={t.reportPlaceholder}
        className="input mt-2 w-full text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={busy || text.trim().length < 3} className="btn-secondary px-3 py-1.5 text-sm">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.reportSend}
        </button>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-brand-700" : "text-sm text-red-700"}>
            {state.msg}
          </p>
        )}
      </div>
    </form>
  );
}
