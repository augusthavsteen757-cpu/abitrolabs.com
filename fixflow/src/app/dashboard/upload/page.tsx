import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/plans";
import { listQuotes } from "@/lib/quotes";
import { UploadForm } from "@/components/UploadForm";
import { Paywall } from "@/components/Paywall";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).upload.metaTitle };
}

export default async function UploadPage() {
  const user = await requireUser();
  const usage = getUsage(user);
  const d = await getDict();
  const t = d.upload;
  const quotes = await listQuotes(user.id);
  const projects = [...new Set(quotes.map((q) => q.projectName))];

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-ink-soft">{t.intro}</p>
      <div className="mt-8">
        {usage.remaining <= 0 ? (
          <Paywall
            title={user.plan === "PRO" ? t.usedProTitle : t.usedFreeTitle}
            text={user.plan === "PRO" ? t.usedProText : t.usedFreeText}
            showSingle
          />
        ) : (
          <UploadForm projects={projects} remaining={usage.remaining} />
        )}
      </div>
    </div>
  );
}
