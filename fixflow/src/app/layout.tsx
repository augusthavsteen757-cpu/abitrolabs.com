import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { INTL_LOCALE } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  const base = process.env.APP_URL || "https://klardal.com";
  return {
    metadataBase: new URL(base),
    title: { default: d.meta.title, template: "%s · Klardal" },
    description: d.meta.description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: "Klardal", title: d.meta.title, description: d.meta.description, url: base },
    // Google Search Console ownership check (set GOOGLE_SITE_VERIFICATION in Render).
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#f7f6f2", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, d } = await getI18n();
  return (
    <html lang={INTL_LOCALE[locale].split("-")[0] === "nb" ? "nb" : INTL_LOCALE[locale].split("-")[0]}>
      <body>
        <I18nProvider locale={locale} d={d}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
