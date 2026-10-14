import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Languages } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE } from "@/i18n/config";
import { publishedArticles, articleBySlug, type Article } from "@/content/articles";

export const dynamic = "force-dynamic";

const base = () => (process.env.APP_URL || "https://klardal.com").replace(/\/$/, "");
const longDate = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "long" }).format(new Date(iso));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = articleBySlug((await params).slug);
  if (!a) return {};
  const url = `${base()}/artikler/${a.slug}`;
  return {
    // The root layout adds " · Klardal".
    title: a.title,
    description: a.description,
    alternates: { canonical: url },
    openGraph: { type: "article", title: a.title, description: a.description, url, publishedTime: a.published, modifiedTime: a.updated },
    // Drafts can be shared by link but must not show up in search results.
    robots: a.draft ? { index: false, follow: true } : undefined,
  };
}

/** Structured data so Google understands the page as an article from Klardal (static values only). */
function articleJsonLd(a: Article) {
  const url = `${base()}/artikler/${a.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: a.title,
        description: a.description,
        datePublished: a.published,
        dateModified: a.updated,
        inLanguage: "da",
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: "Klardal", url: `${base()}/` },
        publisher: { "@type": "Organization", name: "Klardal", logo: { "@type": "ImageObject", url: `${base()}/logo.png` } },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Klardal", item: `${base()}/` },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${base()}/artikler` },
          { "@type": "ListItem", position: 3, name: a.title, item: url },
        ],
      },
    ],
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBySlug((await params).slug);
  if (!a) notFound();
  const [{ locale, d }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const t = d.article;
  const cta = user ? "/dashboard/upload" : `/opret?next=${encodeURIComponent("/dashboard/upload")}`;

  return (
    <>
      <MarketingHeader loggedIn={!!user} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(a)).replace(/</g, "\\u003c") }} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/artikler" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t.all}
        </Link>
        {a.draft && (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="article-draft">{t.draft}</p>
        )}
        {locale !== "da" && (
          <p lang={locale} className="mt-4 flex gap-2 rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">
            <Languages className="mt-0.5 h-4 w-4 shrink-0" /> {t.danishOnly}
          </p>
        )}
        <article lang="da" className="mt-6">
          <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">{a.title}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            <time dateTime={a.updated}>{fmt(t.updated, { date: longDate(a.updated, INTL_LOCALE[locale]) })}</time>
          </p>
          <p className="mt-6 text-lg text-ink-soft">{a.intro}</p>
          {a.sections.map((s) => (
            <section key={s.heading} className="mt-10">
              <h2 className="text-2xl font-semibold">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-ink-soft">{p}</p>
              ))}
              {s.list && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-soft">
                  {s.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {a.sources && a.sources.length > 0 && (
            <p className="mt-10 text-sm text-ink-muted">
              {t.sources}:{" "}
              {a.sources.map((src, i) => (
                <span key={src.url}>
                  {i > 0 && ", "}
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{src.label}</a>
                </span>
              ))}
            </p>
          )}
        </article>

        <aside className="card mt-12 p-6 sm:p-8" data-testid="article-cta">
          <h2 className="text-xl font-semibold">{t.ctaTitle}</h2>
          <p className="mt-2 text-ink-soft">{t.ctaText}</p>
          <Link href={cta} className="btn-primary mt-5 px-6 py-3 text-base">
            {d.home.ctaPrimary} <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>

        {/* Links between the guides, so readers and search engines find the rest. */}
        {publishedArticles().some((o) => o.slug !== a.slug) && (
          <nav className="mt-10" data-testid="article-more">
            <h2 className="text-xl font-semibold">{t.more}</h2>
            <ul className="mt-3 space-y-2">
              {publishedArticles()
                .filter((o) => o.slug !== a.slug)
                .map((o) => (
                  <li key={o.slug}>
                    <Link href={`/artikler/${o.slug}`} className="font-medium text-brand-700 hover:underline">{o.title}</Link>
                  </li>
                ))}
            </ul>
          </nav>
        )}
      </main>
      <MarketingFooter />
    </>
  );
}
