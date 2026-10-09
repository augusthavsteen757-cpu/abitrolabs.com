import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUsage, isBeta } from "@/lib/plans";
import { isDemoMode } from "@/lib/ai";
import { DashboardNav } from "@/components/DashboardNav";
import { getDict } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const usage = getUsage(user);
  const d = await getDict();
  return (
    <div className="min-h-screen">
      <DashboardNav
        name={user.name}
        email={user.email}
        plan={user.plan}
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
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-8 sm:pt-10 lg:pb-16">{children}</main>
      </div>
    </div>
  );
}
