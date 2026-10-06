"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

type Props = {
  kind: "PRO_MONTHLY" | "SINGLE" | "CANCEL";
  quoteId?: string;
  className?: string;
  children: React.ReactNode;
  /** Where to go after a simulated payment. Defaults to refreshing the current page. */
  redirectTo?: string;
  confirmText?: string;
};

export function CheckoutButton({ kind, quoteId, className, children, redirectTo, confirmText }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, quoteId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Betalingen kunne ikke gennemføres.");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noget gik galt.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button type="button" onClick={onClick} disabled={loading} className={cn("w-full", className)}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
