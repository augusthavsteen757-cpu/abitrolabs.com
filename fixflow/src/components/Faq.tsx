import { ChevronDown } from "lucide-react";
import { getDict } from "@/i18n/server";

export async function Faq() {
  const d = await getDict();
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {d.faq.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink hover:bg-paper/60">
            {item.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
