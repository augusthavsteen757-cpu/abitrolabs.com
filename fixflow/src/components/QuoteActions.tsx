"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RotateCcw, Trash2, Unlock } from "lucide-react";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const { d } = useI18n();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button type="button" onClick={copy} className={cn("btn-secondary px-3 py-1.5 text-xs", className)}>
      {copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? d.common.copied : (label ?? d.common.copy)}
    </button>
  );
}

export function DeleteQuoteButton({ id }: { id: string }) {
  const { d } = useI18n();
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm(d.actions.deleteConfirm)) return;
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      window.location.assign("/dashboard");
    } else {
      setBusy(false);
      window.alert(d.actions.deleteFailed);
    }
  }
  return (
    <button type="button" onClick={del} disabled={busy} className="btn-ghost text-red-700 hover:bg-red-50 hover:text-red-800">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {d.common.delete}
    </button>
  );
}

export function RetryButton({ id }: { id: string }) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || d.actions.retryFailed);
    } catch {
      setError(d.common.noConnection);
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <div>
      <button type="button" onClick={retry} disabled={busy} className="btn-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        {busy ? d.actions.retrying : d.actions.retry}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function UnlockWithCreditButton({ id, credits }: { id: string; credits: number }) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function unlock() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quotes/${id}/unlock`, { method: "POST" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : { error: d.common.noConnection };
    if (!res?.ok) {
      setError(json.error || d.unlockCredit.failed);
      setBusy(false);
      return;
    }
    router.refresh();
  }
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
      <p className="font-semibold">{fmt(d.unlockCredit.title, { n: credits })}</p>
      <p className="mt-1 text-sm text-ink-soft">{d.unlockCredit.text}</p>
      <button type="button" onClick={unlock} disabled={busy} className="btn-primary mt-4">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />} {d.unlockCredit.button}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
