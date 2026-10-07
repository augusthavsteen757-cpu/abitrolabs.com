import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getDict } from "@/i18n/server";

export default async function NotFound() {
  const d = await getDict();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="num mt-12 font-display text-7xl font-semibold text-brand-700">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{d.notFound.title}</h1>
      <p className="mt-2 max-w-sm text-ink-soft">{d.notFound.text}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-secondary">{d.notFound.home}</Link>
        <Link href="/dashboard" className="btn-primary">{d.notFound.quotes}</Link>
      </div>
    </main>
  );
}
