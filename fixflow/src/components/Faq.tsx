import { ChevronDown } from "lucide-react";
import { getDict } from "@/i18n/server";
import { isBeta } from "@/lib/plans";

export async function Faq() {
  const d = await getDict();
  // Questions about paid plans are hidden while nothing can be bought (beta).
  const items = d.faq.filter((item) => !(isBeta() && "paidOnly" in item));
  // The same questions as structured data, so search engines and AI answers can quote them (static texts only).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {items.map((item) => (
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
