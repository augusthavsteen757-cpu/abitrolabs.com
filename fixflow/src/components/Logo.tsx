import Link from "next/link";
import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#10231f" />
      {/* A serif "K" in brass. Keep in sync with app/icon1.svg (and regenerate icon2.png, favicon.ico, apple-icon.png, public/logo.png). */}
      <g fill="#c9a46a">
        <rect x="17" y="14" width="7" height="36" />
        <rect x="13" y="14" width="15" height="2.4" />
        <rect x="13" y="47.6" width="15" height="2.4" />
        <path d="M24 33.5 41.6 15.2h3.4L24 37z" />
        <path d="M28.3 30.2 33.4 26 47.5 47.6H40z" />
        <rect x="36" y="14" width="13" height="2.4" />
        <rect x="36.5" y="47.6" width="14" height="2.4" />
      </g>
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
