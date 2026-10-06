import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { PricingCards } from "@/components/PricingCards";
import { Faq } from "@/components/Faq";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Priser" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <>
      <MarketingHeader loggedIn={!!user} />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Priser</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Enkel pris. Ingen binding.</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Se gratis hvordan dit tilbud scorer, og hvilke røde flag der er. Lås hele analysen op for 99 kr. – eller vælg Pro.
          </p>
        </div>
        <div className="mt-12">
          <PricingCards />
        </div>
        <p className="mt-6 text-center text-sm text-ink-muted">Alle priser er inkl. moms. Pro kan opsiges når som helst.</p>
        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center text-3xl font-semibold">Spørgsmål om priser og konto</h2>
          <div className="mt-8">
            <Faq />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
