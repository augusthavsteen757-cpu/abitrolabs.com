import Link from "next/link";
import { Logo } from "./Logo";
import { COMPANY } from "@/lib/company";

export function MarketingHeader({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#saadan" className="btn-ghost hidden md:inline-flex">
            Sådan virker det
          </Link>
          <Link href="/priser" className="btn-ghost hidden sm:inline-flex">
            Priser
          </Link>
          {loggedIn ? (
            <Link href="/dashboard" className="btn-primary">
              Til oversigten
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log ind
              </Link>
              <Link href="/opret" className="btn-primary hidden sm:inline-flex">
                Prøv gratis
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Tryghed, når du bruger mange penge. FixFlow forklarer håndværkertilbud på almindeligt dansk.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <Link href="/priser" className="hover:text-ink">Priser</Link>
          <Link href="/login" className="hover:text-ink">Log ind</Link>
          <Link href="/opret" className="hover:text-ink">Opret konto</Link>
          <Link href="/handelsbetingelser" className="hover:text-ink">Handelsbetingelser</Link>
          <Link href="/privatlivspolitik" className="hover:text-ink">Privatliv og cookies</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-ink-muted sm:px-6">
        © {new Date().getFullYear()} {COMPANY.name} · CVR {COMPANY.cvr}. Analyserne er vejledende og erstatter ikke juridisk eller teknisk rådgivning.
      </p>
    </footer>
  );
}
