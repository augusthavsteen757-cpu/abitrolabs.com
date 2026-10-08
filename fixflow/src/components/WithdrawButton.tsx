"use client";

import { useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";

/** "Fortryd købet" – the withdrawal function for a single payment. */
export function WithdrawButton({ paymentId, amount }: { paymentId: string; amount: string }) {
  const { d } = useI18n();
  const t = d.account;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    try {
      const res = await fetch("/api/billing/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || d.settings.failed);
      setMsg({ ok: true, text: t.withdrawDone });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : d.settings.failed });
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mt-2">
      {confirming && !msg && <p className="mb-2 text-sm">{fmt(t.withdrawConfirm, { amount })}</p>}
      <button type="button" onClick={run} disabled={busy} className="btn-secondary px-3 py-1.5 text-sm" data-testid="withdraw">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
        {confirming ? d.common.confirm : t.withdrawButton}
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "mt-2 text-sm text-brand-700" : "mt-2 text-sm text-red-700"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
