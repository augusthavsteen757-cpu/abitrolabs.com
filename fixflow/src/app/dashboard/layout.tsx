import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUsage, isBeta } from "@/lib/plans";
import { isDemoMode } from "@/lib/ai";
import { DashboardNav } from "@/components/DashboardNav";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { GUEST_DELETE_DAYS, isGuest } from "@/lib/guest";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const usage = getUsage(user);
  const d = await getDict();
  const guest = isGuest(user);
  return (
    <div className="min-h-screen">
      <DashboardNav
        name={guest ? d.guest.navName : user.name}
        email={guest ? "" : user.email}
        plan={usage.plan}
        used={usage.used}
        limit={usage.limit}
        remaining={usage.remaining}
        credits={usage.credits}
        beta={isBeta()}
      />
      <div className="lg:pl-64">
        {isDemoMode() && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-8">
            <p className="mx-auto flex max-w-6xl items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>{d.demoBanner.title}</strong> {d.demoBanner.text}
              </span>
            </p>
          </div>
        )}
        {guest && (
          <div className="border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-900 sm:px-8" data-testid="guest-banner">
            <p className="mx-auto flex max-w-6xl flex-wrap items-start gap-x-2 gap-y-1">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{fmt(d.guest.bannerText, { days: GUEST_DELETE_DAYS })}</span>
              <Link href="/opret" className="font-semibold text-brand-700 underline underline-offset-2">
                {d.guest.bannerLink}
              </Link>
            </p>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">{children}</main>
      </div>
    </div>
  );
}
