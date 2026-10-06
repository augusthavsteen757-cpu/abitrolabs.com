import { Quote, CheckCircle2 } from "lucide-react";
import { Logo } from "./Logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/60 blur-3xl" aria-hidden />
        <div className="relative max-w-md">
          <Quote className="h-10 w-10 text-brand-300" />
          <p className="mt-6 font-display text-3xl font-medium leading-snug text-white">
            “Vi var lige ved at skrive under på 160.000 kr. Bagefter vidste vi præcis, hvad vi skulle spørge om – og
            fik en fast pris.”
          </p>
          <p className="mt-5 text-sm text-brand-200">Eksempel på et typisk forløb med FixFlow</p>
          <ul className="mt-10 space-y-3 text-brand-100">
            {["Hver post forklaret på almindeligt dansk", "Uklare punkter og ekstraudgifter markeret", "Færdige spørgsmål til håndværkeren"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
