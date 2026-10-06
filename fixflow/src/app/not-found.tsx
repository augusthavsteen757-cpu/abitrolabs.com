import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="num mt-12 font-display text-7xl font-semibold text-brand-700">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Siden findes ikke</h1>
      <p className="mt-2 max-w-sm text-ink-soft">Linket kan være forkert, eller siden er blevet flyttet.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-secondary">Til forsiden</Link>
        <Link href="/dashboard" className="btn-primary">Til mine tilbud</Link>
      </div>
    </main>
  );
}
