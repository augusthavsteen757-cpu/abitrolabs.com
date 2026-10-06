"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FilePlus2, Columns3, UserRound, LogOut, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/format";

const NAV: { href: string; label: string; short?: string; icon: typeof LayoutGrid; exact?: boolean }[] = [
  { href: "/dashboard", label: "Oversigt", icon: LayoutGrid, exact: true },
  { href: "/dashboard/upload", label: "Nyt tilbud", icon: FilePlus2 },
  { href: "/dashboard/sammenlign", label: "Sammenlign", icon: Columns3 },
  { href: "/dashboard/find", label: "Find håndværkere", short: "Find", icon: MapPin },
  { href: "/dashboard/konto", label: "Konto", icon: UserRound },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || pathname.startsWith("/dashboard/tilbud");
  return pathname.startsWith(href);
}

type Props = { name: string; email: string; plan: "FREE" | "PRO"; used: number; limit: number; remaining: number; credits: number };

export function DashboardNav({ name, email, plan, used, limit, remaining, credits }: Props) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="px-6 py-5">
          <Logo href="/dashboard" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Hovedmenu">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-800" : "text-ink-soft hover:bg-paper hover:text-ink",
                )}
              >
                <n.icon className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-3 mb-3 rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{plan === "PRO" ? "Pro" : "Gratis"}</span>
            <span className="num text-ink-muted">
              {used}/{limit} brugt
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className={cn("h-full rounded-full", pct >= 100 ? "bg-amber-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
          </div>
          {credits > 0 && <p className="mt-2 text-xs text-ink-muted">+ {credits} engangskøb</p>}
          {plan === "FREE" && (
            <Link href="/dashboard/konto?upgrade=pro" className="mt-3 block text-xs font-semibold text-brand-700 hover:underline">
              Opgradér til Pro →
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-ink-muted">{email}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink" aria-label="Log ud" title="Log ud">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/dashboard/konto" className="badge bg-white text-ink-soft ring-1 ring-line">
            <span className="num font-semibold text-ink">{remaining}</span> {remaining === 1 ? "analyse" : "analyser"} tilbage
          </Link>
          <button onClick={logout} className="rounded-lg p-2 text-ink-muted hover:bg-black/5" aria-label="Log ud">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Hovedmenu"
      >
        {NAV.map((n) => {
          const active = isActive(pathname, n.href, n.exact);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-brand-700" : "text-ink-muted")}
            >
              <n.icon className="h-5 w-5" />
              {n.short ?? n.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
