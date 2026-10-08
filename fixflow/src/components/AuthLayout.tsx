import { CheckCircle2 } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getDict } from "@/i18n/server";

export async function AuthLayout({ children }: { children: React.ReactNode }) {
  const d = await getDict();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/60 blur-3xl" aria-hidden />
        <div className="relative max-w-md">
          <p className="font-display text-3xl font-medium leading-snug text-white">{d.auth.sideQuote}</p>
          <p className="mt-5 text-sm text-brand-200">{d.auth.sideCaption}</p>
          <ul className="mt-10 space-y-3 text-brand-100">
            {d.auth.sideBullets.map((t) => (
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
