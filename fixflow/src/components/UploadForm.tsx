"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Camera, X, Check, Loader2, ShieldCheck } from "lucide-react";
import { cn, formatBytes } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { plural } from "@/i18n/fmt";
import type { Dict } from "@/i18n/dict/da";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX = 10 * 1024 * 1024;
function validate(file: File, t: Dict["upload"]): string | null {
  const okExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
  if (!ACCEPT.split(",").includes(file.type) && !(file.type === "" && okExt)) return t.errType;
  if (file.size > MAX) return t.errSize;
  if (file.size === 0) return t.errEmpty;
  return null;
}

export function UploadForm({ projects, remaining }: { projects: string[]; remaining: number }) {
  const { d } = useI18n();
  const t = d.upload;
  const STEPS = t.steps;
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [project, setProject] = useState(projects[0] ?? "");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 1600);
    return () => clearInterval(t);
  }, [busy, STEPS.length]);

  function pick(f: File | undefined | null) {
    if (!f) return;
    const err = validate(f, t);
    setError(err);
    setFile(err ? null : f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError(t.errChoose);
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectName", project.trim());
    try {
      const res = await fetch("/api/quotes", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t.errFailed);
      setStep(STEPS.length);
      window.location.assign(`/dashboard/tilbud/${json.quote.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errFailed);
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="card p-6 sm:p-8" aria-live="polite">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
          <div className="relative h-44 w-36 shrink-0 overflow-hidden rounded-xl border border-line bg-paper">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover opacity-80" />
            ) : (
              <div className="space-y-2 p-4">
                <div className="h-2.5 w-2/3 rounded bg-ink/15" />
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <div className="h-1.5 rounded bg-ink/10" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
                    <div className="h-1.5 w-6 rounded bg-ink/10" />
                  </div>
                ))}
              </div>
            )}
            <div className="absolute inset-x-0 h-1 animate-scan bg-brand-400 shadow-[0_0_16px_4px_rgba(78,162,131,0.6)]" />
          </div>
          <div className="w-full">
            <h2 className="text-xl font-semibold">{t.waitingTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t.waitingText}</p>
            <ol className="mt-5 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-[15px]">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      i < step ? "bg-brand-600 text-white" : i === step ? "bg-brand-100 text-brand-700" : "bg-paper text-ink-muted",
                    )}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i === step ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={i <= step ? "text-ink" : "text-ink-muted"}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={t.dropAria}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16",
            dragging ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:border-brand-300 hover:bg-brand-50/40",
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <UploadCloud className="h-7 w-7" />
          </span>
          <p className="mt-4 text-lg font-semibold">
            <span className="hidden sm:inline">{t.dropDrag} </span>
            <span className="text-brand-700 underline underline-offset-4">{t.dropChoose}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">{t.fileTypes}</p>
        </div>
      ) : (
        <div className="card flex items-center gap-4 p-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t.previewAlt} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <FileText className="h-7 w-7" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-ink-muted">{formatBytes(file.size)}</p>
          </div>
          <button type="button" onClick={() => setFile(null)} className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink" aria-label={t.removeFile}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="file-input" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      {!file && (
        <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary w-full sm:hidden">
          <Camera className="h-4 w-4" /> {t.camera}
        </button>
      )}

      <div>
        <label htmlFor="project" className="label">{t.project}</label>
        <input
          id="project"
          list="projects"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          maxLength={80}
          className="input"
          placeholder={t.projectPlaceholder}
        />
        <datalist id="projects">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-ink-muted">{t.projectHelp}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={!file} className="btn-primary w-full py-3 text-base">
        {t.submit}
      </button>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        {plural(remaining, t.remainingOne, t.remainingOther)}
      </p>
    </form>
  );
}
