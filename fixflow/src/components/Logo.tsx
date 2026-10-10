import Link from "next/link";
import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#1c5746" />
      {/* "Klar dal": the checkmark is a valley with the sun rising in it. Keep in sync with app/icon.svg. */}
      <circle cx="25" cy="28.5" r="5.5" fill="#f2c46d" />
      <path d="M11 33 24 46 52 17" fill="none" stroke="#7cc0a5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="Klardal – forside">
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold tracking-tight", light ? "text-white" : "text-ink")}>
        Klardal
      </span>
    </Link>
  );
}
