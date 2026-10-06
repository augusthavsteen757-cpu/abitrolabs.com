import { ChevronDown } from "lucide-react";

export const FAQ_ITEMS = [
  {
    q: "Hvordan virker FixFlow?",
    a: "Du uploader dit tilbud som PDF eller foto. Vi læser det, forklarer hver post på almindeligt dansk, finder uklare punkter og mulige ekstraudgifter og giver dig konkrete spørgsmål, du kan stille håndværkeren.",
  },
  {
    q: "Er FixFlow imod håndværkere?",
    a: "Nej. De fleste håndværkere er seriøse og dygtige. Et uklart tilbud skyldes oftest travlhed – ikke ond vilje. FixFlow hjælper jer med at blive enige om det samme, før arbejdet går i gang.",
  },
  {
    q: "Kan jeg stole på analysen?",
    a: "Analysen er en hjælp til at stille de rigtige spørgsmål – ikke juridisk eller teknisk rådgivning. Tilbudsscoren beregnes efter faste regler, så den er ens for alle tilbud. Ved store eller komplicerede projekter anbefaler vi altid at tale med en byggerådgiver.",
  },
  {
    q: "Hvad sker der med mine filer?",
    a: "Dine tilbud bliver kun brugt til at lave din analyse. De gemmes på din konto, og du kan slette dem når som helst – så slettes filen også.",
  },
  {
    q: "Hvilke filer kan jeg uploade?",
    a: "PDF, JPG, PNG og WEBP op til 10 MB. Et tydeligt foto taget med mobilen virker fint.",
  },
  {
    q: "Kan jeg opsige Pro?",
    a: "Ja, når som helst fra din kontoside. Dine analyser bliver liggende, og tilbud du har låst op, forbliver låst op.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink hover:bg-paper/60">
            {item.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
