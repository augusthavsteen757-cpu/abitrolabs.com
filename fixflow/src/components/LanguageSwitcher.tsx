"use client";

import { Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/format";

export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { locale, d } = useI18n();

  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{d.lang.label}</span>
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-ink-muted" aria-hidden />
      <select
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        className={cn(
          "cursor-pointer appearance-none rounded-xl border border-line bg-white py-2 pl-8 text-sm font-medium text-ink hover:bg-paper focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          compact ? "w-[4.5rem] pr-2" : "pr-3",
        )}
        data-testid="language-switcher"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {compact ? l.toUpperCase() : LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
