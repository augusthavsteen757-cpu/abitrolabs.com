import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../../landing.css";
import { KlFooter, KlHeader } from "@/components/KlChrome";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tak", robots: { index: false, follow: false } };

/** Where Stripe sends the firm back after saving the card (or cancelling). */
export default async function SignupThanks({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cancelled = (await searchParams).betaling === "afbrudt";
  return (
    <div className="kl" lang="da">
      <KlHeader />
      <main className="wrap about">
        <div className="done" role="status" data-testid="signup-thanks">
          {cancelled ? (
            <>
              <h1>Kortet blev ikke lagt ind</h1>
              <p>Jeres tilmelding er modtaget. Vi sender jer et nyt link til betalingen, eller I kan vælge MobilePay eller Betalingsservice, når vi ringer.</p>
            </>
          ) : (
            <>
              <h1>Tak. Vi går i gang.</h1>
              <p>Kortet er gemt, og der trækkes først penge efter den gratis måned. I kan opsige når som helst.</p>
              <p>Vi ringer, når alt er sat op, så I kan se det hele, før det går live.</p>
            </>
          )}
          {COMPANY.email.includes("@") && <p>Spørgsmål? Skriv til <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>}
        </div>
      </main>
      <KlFooter />
    </div>
  );
}
