import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { COMPANY } from "@/lib/company";
import { getDict } from "@/i18n/server";

export async function MarketingHeader({ loggedIn = false }: { loggedIn?: boolean }) {
  const d = await getDict();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#saadan" className="btn-ghost hidden lg:inline-flex">
            {d.header.howItWorks}
          </Link>
          <Link href="/priser" className="btn-ghost hidden md:inline-flex">
            {d.header.pricing}
          </Link>
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
