import type { Metadata } from "next";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../landing.css";
import { SignupForm } from "@/components/SignupForm";
import { KlFooter, KlHeader } from "@/components/KlChrome";

export const metadata: Metadata = {
  title: "Sig ja til Klardal",
  // A personal link sent to firms – not something to show on Google.
  robots: { index: false, follow: true },
  alternates: { canonical: "/tilmeld" },
};
export const dynamic = "force-dynamic";

/** Link sent to a firm after the call, e.g. /tilmeld?firma=Rask%20Klip&pakke=149 */
export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const firma = typeof q.firma === "string" ? q.firma.slice(0, 120) : "";
  const pakke = q.pakke === "199" ? "199" : "149";
  return (
    <div className="kl" lang="da">
      <KlHeader />
      <main className="wrap about">
        <h1>{firma ? `Klar til ${firma}?` : "Sig ja til Klardal"}</h1>
        <p className="lead">Udfyld det, I vil, og tryk på Send ja. Resten klarer vi. I skal ikke give os kodeord.</p>
        <SignupForm firma={firma} pakke={pakke} />
      </main>
      <KlFooter />
    </div>
  );
}
