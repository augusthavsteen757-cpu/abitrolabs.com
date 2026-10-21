import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/plans";
import { listQuotes } from "@/lib/quotes";
import { UploadForm } from "@/components/UploadForm";
import { Paywall } from "@/components/Paywall";
import { getDict } from "@/i18n/server";
import { isGuest } from "@/lib/guest";

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
      <p className="mt-3 flex gap-2 text-sm text-ink-muted" data-testid="danish-only">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t.danishOnly}
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        {d.compare.uploadLinkText}{" "}
        <Link href="/dashboard/sammenlign/ny" className="font-semibold text-brand-700 underline underline-offset-2" data-testid="compare-link">
          {d.compare.uploadLink}
        </Link>
      </p>
      <div className="mt-8">
        {usage.remaining <= 0 && isGuest(user) ? (
          <div className="card p-6 text-center" data-testid="guest-used">
            <h2 className="text-xl font-semibold">{d.guest.usedTitle}</h2>
            <p className="mt-2 text-ink-soft">{d.guest.usedText}</p>
            <Link href="/opret" className="btn-primary mt-5 inline-flex">
              {d.guest.usedButton}
            </Link>
          </div>
        ) : usage.remaining <= 0 ? (
          <Paywall
            title={usage.plan === "PRO" ? t.usedProTitle : t.usedFreeTitle}
            text={usage.plan === "PRO" ? t.usedProText : t.usedFreeText}
            showSingle
          />
        ) : (
          <UploadForm projects={projects} remaining={usage.remaining} />
        )}
      </div>
    </div>
  );
}
