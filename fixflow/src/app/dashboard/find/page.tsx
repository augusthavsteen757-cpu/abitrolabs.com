import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { TRADES, isCvrEnabled, type TradeKey } from "@/lib/contractors";
import { FindContractors } from "@/components/FindContractors";
import { getDict } from "@/i18n/server";
import { da } from "@/i18n/dict/da";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).find.metaTitle };
}

export default async function FindPage() {
  const user = await requireUser();
  const d = await getDict();
  const trades = (Object.keys(TRADES) as TradeKey[]).map((key) => ({
    key,
    label: d.labels.trade[key],
    labelDa: da.labels.trade[key],
  }));
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-4xl">{d.find.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{d.find.intro}</p>
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
