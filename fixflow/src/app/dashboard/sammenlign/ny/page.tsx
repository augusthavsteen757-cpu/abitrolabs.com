import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/plans";
import { CompareUploadForm } from "@/components/CompareUploadForm";
import { Paywall } from "@/components/Paywall";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).compare.newTitle };
}

/** Upload 2–3 quotes at once and go straight to the comparison. */
export default async function NewComparePage() {
  const user = await requireUser();
  const usage = getUsage(user);
  const d = await getDict();
  const t = d.compare;
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t.newTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.newIntro}</p>
      <p className="mt-3 flex gap-2 text-sm text-ink-muted">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {d.upload.danishOnly}
      </p>
      <div className="mt-8">
        {usage.remaining < 2 ? (
          <Paywall title={d.upload.usedFreeTitle} text={d.upload.usedFreeText} showSingle />
        ) : (
          <CompareUploadForm remaining={usage.remaining} defaultProject={d.upload.defaultProject} />
        )}
      </div>
    </div>
  );
}
