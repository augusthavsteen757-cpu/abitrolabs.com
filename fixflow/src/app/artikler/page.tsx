import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import { publishedArticles } from "@/content/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDict()).article;
  // An empty list is not worth showing in search results.
  return { title: t.indexTitle, description: t.indexText, robots: publishedArticles().length ? undefined : { index: false } };
}

export default async function ArticlesPage() {
  const [d, user] = await Promise.all([getDict(), getCurrentUser()]);
  const t = d.article;
  const articles = publishedArticles();
  return (
    <>
      <MarketingHeader loggedIn={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold sm:text-5xl">{t.indexTitle}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t.indexText}</p>
        <ul className="mt-8 space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/artikler/${a.slug}`} className="card group flex items-center gap-4 p-5 hover:shadow-lift">
                <div className="min-w-0 flex-1">
                  <h2 lang="da" className="font-sans text-lg font-semibold">{a.title}</h2>
                  <p lang="da" className="mt-1 text-sm text-ink-soft">{a.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-ink-muted group-hover:text-brand-700" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </>
  );
}
