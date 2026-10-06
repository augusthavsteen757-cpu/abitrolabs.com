import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/plans";
import { listQuotes } from "@/lib/quotes";
import { UploadForm } from "@/components/UploadForm";
import { Paywall } from "@/components/Paywall";

export const metadata: Metadata = { title: "Nyt tilbud" };

export default async function UploadPage() {
  const user = await requireUser();
  const usage = getUsage(user);
  const quotes = await listQuotes(user.id);
  const projects = [...new Set(quotes.map((q) => q.projectName))];

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <h1 className="text-3xl font-semibold sm:text-4xl">Analysér et tilbud</h1>
      <p className="mt-2 text-ink-soft">
        Upload tilbuddet som PDF eller tag et billede. Vi forklarer det på almindeligt dansk og finder det, du bør spørge om.
      </p>
      <div className="mt-8">
        {usage.remaining <= 0 ? (
          <Paywall
            title={user.plan === "PRO" ? "Du har brugt dine 10 analyser i denne periode" : "Du har brugt din gratis analyse"}
            text={
              user.plan === "PRO"
                ? "Køb en ekstra analyse, eller vent til din næste periode starter."
                : "Opgradér til Pro for 10 analyser om måneden, eller køb en enkelt analyse."
            }
            showSingle
          />
        ) : (
          <UploadForm projects={projects} remaining={usage.remaining} />
        )}
      </div>
    </div>
  );
}
