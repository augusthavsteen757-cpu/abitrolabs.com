import { AlertTriangle } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "./MarketingShell";
import { isCompanyConfigured, LEGAL_UPDATED } from "@/lib/company";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">Senest opdateret {LEGAL_UPDATED}</p>
        {!isCompanyConfigured() && (
          <p className="mt-6 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Udkast:</strong> Virksomhedsoplysningerne i [firkantede parenteser] er ikke udfyldt endnu. Teksten
              skal gennemgås af en advokat før lancering.
            </span>
          </p>
        )}
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
