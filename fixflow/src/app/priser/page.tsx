import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { PricingCards } from "@/components/PricingCards";
import { isBeta } from "@/lib/plans";
import { Faq } from "@/components/Faq";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).header.pricing };
}
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();
  const d = await getDict();
  return (
    <>
      <MarketingHeader loggedIn={!!user} />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{d.header.pricing}</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{d.pricingPage.title}</h1>
          {!isBeta() && <p className="mt-4 text-lg text-ink-soft">{d.pricingPage.text}</p>}
        </div>
        <div className="mt-12">
          <PricingCards />
        </div>
        {!isBeta() && <p className="mt-6 text-center text-sm text-ink-muted">{d.pricingPage.note}</p>}
        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center text-3xl font-semibold">{d.pricingPage.faqTitle}</h2>
          <div className="mt-8">
            <Faq />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
