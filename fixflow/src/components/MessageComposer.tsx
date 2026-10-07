"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { CopyButton } from "./QuoteActions";
import { cn, formatShortDate } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { INTL_LOCALE, LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

type Message = { id: string; topic: string; body: string; createdAt: string | number | Date };
type Tone = "venlig" | "neutral" | "bestemt";

const TONES: Tone[] = ["venlig", "neutral", "bestemt"];

export function MessageComposer({
  quoteId,
  suggestions,
  initialMessages,
}: {
  quoteId: string;
  suggestions: string[];
  initialMessages: Message[];
}) {
  const params = useSearchParams();
  const { d, locale } = useI18n();
  const t = d.composer;
  // Messages usually go to a Danish contractor, so Danish is the default.
  const [msgLang, setMsgLang] = useState<Locale>("da");
  const spoerg = params.get("spoerg");
  const [topic, setTopic] = useState(spoerg ?? "");
  const [tone, setTone] = useState<Tone>("venlig");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // React to ?spoerg changes after mount (clicking "Spørg håndværkeren" on the same page).
  useEffect(() => {
    if (!spoerg) return;
    setTopic(spoerg);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    textareaRef.current?.focus({ preventScroll: true });
  }, [spoerg]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 3) return setError(t.needTopic);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone, language: msgLang }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t.failed);
      setMessages((m) => [json.message, ...m]);
    } catch (err) {
      setError(err instanceof Error ? err.message : d.common.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={sectionRef} className="scroll-mt-24">
      <form onSubmit={generate} className="card p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-soft">{t.suggestions}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTopic(s)}
              className={cn(
                "max-w-full truncate rounded-full border px-3 py-1.5 text-left text-sm transition-colors",
                topic === s ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line bg-white text-ink-soft hover:border-brand-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <label htmlFor="topic" className="label mt-5">{t.topic}</label>
        <textarea
          id="topic"
          ref={textareaRef}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          maxLength={500}
          className="input resize-y"
          placeholder={t.topicPlaceholder}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div role="radiogroup" aria-label={t.tone} className="inline-flex self-start rounded-xl bg-paper p-1">
              {TONES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={tone === value}
                  onClick={() => setTone(value)}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                    tone === value ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t.tones[value]}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="msgLang" className="mb-1 block text-xs font-medium text-ink-muted">{t.language}</label>
              <select id="msgLang" value={msgLang} onChange={(e) => setMsgLang(e.target.value as Locale)} className="input py-1.5 text-sm" title={t.languageHint}>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? t.writing : t.write}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      {messages.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-ink-soft">{fmt(t.yourMessages, { n: messages.length })}</p>
          {messages.map((m) => (
            <article key={m.id} className="card animate-fade-up p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs text-ink-muted">
                  <span className="font-medium text-ink-soft">{m.topic}</span> · {formatShortDate(m.createdAt, INTL_LOCALE[locale])}
                </p>
                <CopyButton text={m.body} className="shrink-0" />
              </div>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{m.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
