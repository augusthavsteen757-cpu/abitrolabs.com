"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

export function ForgotPasswordForm({ contactEmail }: { contactEmail: string }) {
  const { d } = useI18n();
  const a = d.auth;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const email = new FormData(e.currentTarget).get("email");
      const { ok, json } = await post("/api/auth/forgot", { email });
      if (!ok) setMsg({ ok: false, text: json.error || d.common.somethingWrong });
      else setMsg({ ok: true, text: json.emailEnabled === false ? fmt(a.forgotNoEmail, { email: contactEmail }) : a.forgotSent });
    } catch {
      setMsg({ ok: false, text: d.common.noConnection });
    }
    setBusy(false);
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold">{a.forgotTitle}</h1>
      <p className="mt-2 text-ink-soft">{a.forgotText}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">{a.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input mt-1.5" placeholder={a.emailPlaceholder} />
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800" : "rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {a.forgotButton}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">{a.backToLogin}</Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const { d } = useI18n();
  const a = d.auth;
  const token = useSearchParams().get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const password = new FormData(e.currentTarget).get("password");
      const { ok, json } = await post("/api/auth/reset", { token, password });
      if (ok) setDone(true);
      else setError(json.error || d.common.somethingWrong);
    } catch {
      setError(d.common.noConnection);
    }
    setBusy(false);
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold">{a.resetTitle}</h1>
      {done ? (
        <p role="status" className="mt-6 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">{a.resetDone}</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="text-sm font-medium">{a.password}</label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="input mt-1.5" placeholder={a.passwordNew} />
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !token} className="btn-primary w-full py-3 text-base">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {a.resetButton}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">{a.backToLogin}</Link>
      </p>
    </div>
  );
}
