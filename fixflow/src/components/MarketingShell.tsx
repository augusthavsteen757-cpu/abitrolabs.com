import Link from "next/link";
import { FilePlus2, Columns3, MapPin, Tag } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { COMPANY } from "@/lib/company";
import { getDict } from "@/i18n/server";

export async function MarketingHeader({ loggedIn = false }: { loggedIn?: boolean }) {
  const d = await getDict();
  // The same main features as inside the app, so visitors can go straight to what they came for.
  // Logged out: sign up first, then continue to the page they picked.
  const app = (path: string) => (loggedIn ? path : `/opret?next=${encodeURIComponent(path)}`);
  const menu = [
    { href: app("/dashboard/upload"), label: d.nav.newQuote, icon: FilePlus2 },
    { href: app("/dashboard/sammenlign"), label: d.nav.compare, icon: Columns3 },
    { href: app("/dashboard/find"), label: d.nav.find, short: d.nav.findShort, icon: MapPin },
    { href: "/priser", label: d.header.pricing, icon: Tag },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label={d.nav.mainMenu}>
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className="btn-ghost hidden xl:inline-flex">
              {m.label}
            </Link>
          ))}
          <LanguageSwitcher compact className="sm:hidden" />
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {loggedIn ? (
            <Link href="/dashboard" className="btn-primary">
              {d.header.toDashboard}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                {d.header.login}
              </Link>
              <Link href="/opret" className="btn-primary hidden sm:inline-flex">
                {d.header.tryFree}
              </Link>
            </>
          )}
        </nav>
      </div>
      {/* Phones: the main features as a row of tabs under the logo */}
      <nav className="grid grid-cols-4 px-1 xl:hidden" aria-label={d.nav.mainMenu}>
        {menu.map((m) => (
          <Link key={m.href} href={m.href} className="flex flex-col items-center gap-1 pb-2 pt-1 text-[11px] font-medium text-ink-soft">
            <m.icon className="h-5 w-5" aria-hidden />
            {m.short ?? m.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export async function MarketingFooter() {
  const d = await getDict();
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-muted">{d.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <Link href="/priser" className="hover:text-ink">{d.footer.pricing}</Link>
          <Link href="/login" className="hover:text-ink">{d.footer.login}</Link>
          <Link href="/opret" className="hover:text-ink">{d.footer.signup}</Link>
          <Link href="/handelsbetingelser" className="hover:text-ink">{d.footer.terms}</Link>
          <Link href="/privatlivspolitik" className="hover:text-ink">{d.footer.privacy}</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-ink-muted sm:px-6">
        © {new Date().getFullYear()} {COMPANY.name} · CVR {COMPANY.cvr} · {COMPANY.address} ·{" "}
        <a href={`mailto:${COMPANY.email}`} className="underline">{COMPANY.email}</a>
        {COMPANY.phone && ` · ${COMPANY.phone}`}. {d.footer.disclaimer}
      </p>
    </footer>
  );
}
