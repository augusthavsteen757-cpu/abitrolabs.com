import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { INTL_LOCALE } from "@/i18n/config";
import { fmt } from "@/i18n/fmt";
import { betaEndText, isBeta } from "@/lib/plans";
import { ORG_DESCRIPTION } from "@/lib/organization";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  const base = process.env.APP_URL || "https://klardal.com";
  // While the old quote check is closed, no page may fall back to its title and description.
  const meta = process.env.OLD_TOOL === "1" ? d.meta : { title: "Klardal", description: ORG_DESCRIPTION };
  return {
    metadataBase: new URL(base),
    title: { default: meta.title, template: "%s · Klardal" },
    description: meta.description,
    openGraph: { type: "website", siteName: "Klardal", title: meta.title, description: meta.description, url: base },
    // Google Search Console ownership check (set GOOGLE_SITE_VERIFICATION in Render).
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#f7f6f2", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, d } = await getI18n();
  // The booking pages ("/" and "/om") are not part of the quote check, so they have no beta banner.
  const isLanding = ["/", "/om"].includes((await headers()).get("x-klardal-path") ?? "");
  return (
    <html lang={process.env.OLD_TOOL === "1" ? INTL_LOCALE[locale].split("-")[0] : "da"}>
      <body>
        <I18nProvider locale={locale} d={d}>
          {isBeta() && process.env.OLD_TOOL === "1" && !isLanding && (
            // The end of the free trial is stated on every page.
            <p className="bg-brand-800 px-4 py-2 text-center text-sm font-medium text-white" data-testid="beta-banner">
              {fmt(d.beta.banner, { date: betaEndText(INTL_LOCALE[locale]) })}
            </p>
          )}
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
