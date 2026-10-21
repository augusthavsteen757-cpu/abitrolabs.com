"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";

/** "Tjek uden konto": accept the terms, then straight to the upload page (see lib/guest.ts). */
export function GuestStart({ days }: { days: number }) {
  const { d } = useI18n();
  const g = d.guest;
  const a = d.auth;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptTerms: form.get("acceptTerms") === "on" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || d.common.somethingWrong);
        setLoading(false);
        return;
      }
      window.location.assign("/dashboard/upload");
    } catch {
      setError(d.common.noConnection);
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">{g.title}</h1>
      <p className="mt-2 text-ink-soft">{g.text}</p>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        {g.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {fmt(b, { days })}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate data-testid="guest-form">
        <label className="flex cursor-pointer gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700" />
          <span>
            {a.acceptPrefix}{" "}
            <Link href="/handelsbetingelser" target="_blank" className="font-medium text-brand-700 underline">{a.acceptTerms}</Link>{" "}
            {a.acceptMiddle}{" "}
            <Link href="/privatlivspolitik" target="_blank" className="font-medium text-brand-700 underline">{a.acceptPrivacy}</Link>.
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {g.startButton}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {g.haveAccount} <Link href="/login" className="font-semibold text-brand-700 hover:underline">{a.loginButton}</Link>
      </p>
    </div>
  );
}
