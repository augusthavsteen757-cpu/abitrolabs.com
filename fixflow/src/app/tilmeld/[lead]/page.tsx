import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "../../landing.css";
import { SignupView } from "@/components/SignupView";
import { LEADS, servicesFor } from "@/lib/leads";

export const dynamic = "force-dynamic";

const leadOf = (slug: string) => (Object.hasOwn(LEADS, slug) ? LEADS[slug] : undefined);

export async function generateMetadata({ params }: { params: Promise<{ lead: string }> }): Promise<Metadata> {
  const lead = leadOf((await params).lead);
  return {
    title: lead ? `Velkommen, ${lead.firma}` : "Kom i gang med Klardal",
    // Personal links are sent to one firm – never on Google.
    robots: { index: false, follow: false },
  };
}

/** Personal link, e.g. klardal.com/tilmeld/rask-klip: the form arrives filled in from what we know about the firm. */
export default async function LeadSignupPage({ params }: { params: Promise<{ lead: string }> }) {
  const lead = leadOf((await params).lead);
  if (!lead) notFound();
  return <SignupView firma={lead.firma} pakke={lead.pakke} ydelser={servicesFor(lead)} aabningstider={lead.aabningstider} />;
}
