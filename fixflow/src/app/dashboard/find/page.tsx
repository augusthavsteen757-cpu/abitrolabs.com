import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { TRADES, isCvrEnabled } from "@/lib/contractors";
import { FindContractors } from "@/components/FindContractors";

export const metadata: Metadata = { title: "Find håndværkere" };

export default async function FindPage() {
  const user = await requireUser();
  const trades = Object.entries(TRADES).map(([key, t]) => ({ key, label: t.label }));
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-4xl">Find håndværkere tæt på dig</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Find firmaer i nærheden, bed dem om et tilbud med én besked – og sammenlign tilbuddene her bagefter. Vi rangerer
        ikke firmaerne efter kvalitet; det bedste tilbud finder du, når tilbuddene ligger side om side.
      </p>
      <div className="mt-8">
        <FindContractors
          trades={trades}
          initialPostalCode={user.postalCode ?? ""}
          customerName={user.name}
          demo={!isCvrEnabled()}
        />
      </div>
    </div>
  );
}
