import { SignupForm } from "@/components/SignupForm";
import { KlFooter, KlHeader } from "@/components/KlChrome";
import type { Plan } from "@/lib/signup";

/** The sign-up page body, shared by the open link (/tilmeld) and the personal links (/tilmeld/<firm>). */
export function SignupView(props: { firma?: string; pakke?: Plan; ydelser?: readonly string[]; aabningstider?: string }) {
  const personal = !!props.ydelser?.length;
  return (
    <div className="kl" lang="da">
      <KlHeader />
      <main className="wrap about">
        <h1>{props.firma ? `Velkommen, ${props.firma}` : "Kom i gang med Klardal"}</h1>
        <p className="lead">
          {personal
            ? "Vi har udfyldt det meste for jer. Tjek det, tilføj jeres kontaktoplysninger, og tryk på Kom i gang. Vi viser jer resultatet, før det går live. Første måned er gratis, og I binder jer ikke."
            : "Det tager to minutter. Fortæl os lidt om jer, så sætter vi det hele op og viser jer resultatet, før det går live. Første måned er gratis, og I binder jer ikke."}
        </p>
        <SignupForm {...props} />
      </main>
      <KlFooter />
    </div>
  );
}
