"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Only same-site paths – "/\\evil.com" and "//evil.com" would otherwise send users to another site. */
function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.includes("\\")) return null;
  try {
    // Resolve against a fixed placeholder origin (also works during server rendering).
    const base = "https://klardal.invalid";
    const u = new URL(next, base);
    return u.origin === base ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const { d } = useI18n();
  const a = d.auth;
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
        setError(json.error || d.common.somethingWrong);
        setLoading(false);
        return;
      }
      let dest = next || "/dashboard";
      if (plan === "pro" || plan === "single") dest = `/dashboard/konto?upgrade=${plan}`;
      // Full navigation so the dashboard renders with the new session (and no stale router cache).
      window.location.assign(dest);
    } catch {
      setError(d.common.noConnection);
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  return (
    <div>
      <h1 className="text-3xl font-semibold">{isSignup ? a.signupTitle : a.loginTitle}</h1>
      <p className="mt-2 text-ink-soft">
        {isSignup ? a.signupText : a.loginText}
      </p>
      {plan && isSignup && (
        <p className="mt-4 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
          {plan === "pro" ? a.chosePro : a.choseSingle}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {isSignup && (
          <div>
            <label htmlFor="name" className="label">{a.name}</label>
            <input id="name" name="name" required autoComplete="name" className="input" placeholder={a.namePlaceholder} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">{a.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" placeholder={a.emailPlaceholder} />
        </div>
        <div>
          <label htmlFor="password" className="label">{a.password}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isSignup ? 10 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="input"
            placeholder={isSignup ? a.passwordNew : "••••••••"}
          />
          {!isSignup && (
            <p className="mt-1.5 text-right text-sm">
              <Link href="/glemt-adgangskode" className="text-brand-700 hover:underline">{a.forgotLink}</Link>
            </p>
          )}
        </div>
        {isSignup && (
          <label className="flex cursor-pointer gap-2.5 text-sm text-ink-soft">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700" />
            <span>
              {a.acceptPrefix}{" "}
              <Link href="/handelsbetingelser" target="_blank" className="font-medium text-brand-700 underline">{a.acceptTerms}</Link>{" "}
              {a.acceptMiddle}{" "}
              <Link href="/privatlivspolitik" target="_blank" className="font-medium text-brand-700 underline">{a.acceptPrivacy}</Link>.
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
          {isSignup ? a.signupButton : a.loginButton}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {isSignup ? (
          <>{a.haveAccount} <Link href={`/login${carryQs}`} className="font-semibold text-brand-700 hover:underline">{a.loginButton}</Link></>
        ) : (
          <>{a.newHere} <Link href={`/opret${carryQs}`} className="font-semibold text-brand-700 hover:underline">{a.createFree}</Link></>
        )}
      </p>
      {!isSignup && (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4 text-sm">
          <p className="font-semibold text-brand-800">{a.demoTitle}</p>
          <p className="mt-1 text-ink-soft">
            {a.demoEmail}: <span className="font-mono text-ink">demo@klardal.dk</span>
            <br />
            {a.demoPassword}: <span className="font-mono text-ink">demo1234</span>
          </p>
        </div>
      )}
    </div>
  );
}
