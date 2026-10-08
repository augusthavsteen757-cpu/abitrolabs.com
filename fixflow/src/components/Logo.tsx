import Link from "next/link";
import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#1c5746" />
      <path d="M20 34.5 28.5 43 45 23" fill="none" stroke="#7cc0a5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="Merova – forside">
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold tracking-tight", light ? "text-white" : "text-ink")}>
        Merova
      </span>
    </Link>
  );
}
