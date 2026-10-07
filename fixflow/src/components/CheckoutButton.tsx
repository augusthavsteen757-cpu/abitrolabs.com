"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";

type Props = {
  kind: "PRO_MONTHLY" | "SINGLE" | "CANCEL" | "RESUME";
  quoteId?: string;
  className?: string;
  children: React.ReactNode;
  /** Where to go after a simulated payment. Defaults to refreshing the current page. */
  redirectTo?: string;
  confirmText?: string;
  /** Light text for the consent line when the button sits on a dark card. */
  dark?: boolean;
};

export function CheckoutButton({ kind, quoteId, className, children, redirectTo, confirmText, dark }: Props) {
  const router = useRouter();
  const { d } = useI18n();
  const consentId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isPurchase = kind === "PRO_MONTHLY" || kind === "SINGLE";

  async function onClick() {
    if (isPurchase && !consent) {
      setError(d.checkout.needConsent);
      return;
    }
    if (confirmText && !confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, quoteId, consent: isPurchase ? consent : undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || d.checkout.failed);
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      if (redirectTo && redirectTo !== window.location.pathname) {
        window.location.assign(redirectTo);
        return;
      }
      router.refresh();
      setLoading(false);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : d.common.somethingWrong);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {isPurchase && (
        <label htmlFor={consentId} className={cn("mb-3 flex cursor-pointer gap-2 text-xs leading-relaxed", dark ? "text-brand-100" : "text-ink-soft")}>
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            {d.checkout.consent}{" "}
            <Link href="/handelsbetingelser" target="_blank" className="underline">{d.checkout.terms}</Link>
          </span>
        </label>
      )}
      {confirming && confirmText && <p className={cn("mb-2 text-sm", dark ? "text-white" : "text-ink")}>{confirmText}</p>}
      <button type="button" onClick={onClick} disabled={loading} className={cn("w-full", className)}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {confirming ? d.common.confirm : children}
      </button>
      {error && (
        <p role="alert" className={cn("mt-2 text-sm", dark ? "text-red-200" : "text-red-700")}>
          {error}
        </p>
      )}
    </div>
  );
}
