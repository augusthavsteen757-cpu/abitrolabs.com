"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const plan = params.get("plan");
  const next = safeNext(params.get("next"));
  const carry = new URLSearchParams();
  if (plan) carry.set("plan", plan);
  if (next) carry.set("next", next);
  const carryQs = carry.toString() ? `?${carry}` : "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      ...Object.fromEntries(form),
      acceptTerms: form.get("acceptTerms") === "on",
    };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Noget gik galt. Prøv igen.");
        setLoading(false);
        return;
      }
      let dest = next || "/dashboard";
      if (plan === "pro" || plan === "single") dest = `/dashboard/konto?upgrade=${plan}`;
      // Full navigation so the dashboard renders with the new session (and no stale router cache).
      window.location.assign(dest);
    } catch {
      setError("Ingen forbindelse. Tjek dit internet og prøv igen.");
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  return (
    <div>
      <h1 className="text-3xl font-semibold">{isSignup ? "Opret gratis konto" : "Velkommen tilbage"}</h1>
      <p className="mt-2 text-ink-soft">
        {isSignup ? "Din første analyse er gratis. Intet kreditkort." : "Log ind for at se dine tilbud."}
      </p>
      {plan && isSignup && (
        <p className="mt-4 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
          {plan === "pro" ? "Du har valgt Pro. Opret din konto først – så kommer du direkte til betaling." : "Du har valgt et engangskøb. Opret din konto først – så kommer du direkte til betaling."}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {isSignup && (
          <div>
            <label htmlFor="name" className="label">Navn</label>
            <input id="name" name="name" required autoComplete="name" className="input" placeholder="Fornavn Efternavn" />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" placeholder="dig@eksempel.dk" />
        </div>
        <div>
          <label htmlFor="password" className="label">Adgangskode</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isSignup ? 10 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="input"
            placeholder={isSignup ? "Mindst 10 tegn" : "••••••••"}
          />
        </div>
        {isSignup && (
          <label className="flex cursor-pointer gap-2.5 text-sm text-ink-soft">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700" />
            <span>
              Jeg accepterer{" "}
              <Link href="/handelsbetingelser" target="_blank" className="font-medium text-brand-700 underline">handelsbetingelserne</Link>{" "}
              og har læst{" "}
              <Link href="/privatlivspolitik" target="_blank" className="font-medium text-brand-700 underline">privatlivspolitikken</Link>.
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSignup ? "Opret konto" : "Log ind"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {isSignup ? (
          <>Har du allerede en konto? <Link href={`/login${carryQs}`} className="font-semibold text-brand-700 hover:underline">Log ind</Link></>
        ) : (
          <>Ny her? <Link href={`/opret${carryQs}`} className="font-semibold text-brand-700 hover:underline">Opret gratis konto</Link></>
        )}
      </p>
      {!isSignup && (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4 text-sm">
          <p className="font-semibold text-brand-800">Demo-konto</p>
          <p className="mt-1 text-ink-soft">
            E-mail: <span className="font-mono text-ink">demo@fixflow.dk</span>
            <br />
            Adgangskode: <span className="font-mono text-ink">demo1234</span>
          </p>
        </div>
      )}
    </div>
  );
}
