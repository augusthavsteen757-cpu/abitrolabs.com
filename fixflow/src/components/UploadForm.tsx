"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Camera, X, Check, Loader2, ShieldCheck, Plus, Info } from "lucide-react";
import { cn, formatBytes } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/fmt";
import type { Dict } from "@/i18n/dict/da";
import { HOUSING, JOB_NOTE_MAX, JOB_TYPES, LOAD_BEARING } from "@/lib/job-context";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX = 10 * 1024 * 1024;
/** Pages/screenshots of one quote – joined into one PDF on the server (see lib/combine.ts). */
const MAX_FILES = 10;
/** The AI reads images up to ~2.5k px; bigger phone photos only cost upload time and can exceed its 5 MB limit. */
const MAX_EDGE = 2576;

/**
 * Shrinks large photos in the browser (JPEG, max 2576 px) before upload. Returns the original if not needed.
 * `pdfSafe`: the file will be joined into a PDF, which takes only JPEG and PNG – so WebP is converted too.
 */
export async function shrinkImage(file: File, pdfSafe = false): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const mustConvert = pdfSafe && file.type !== "image/jpeg" && file.type !== "image/png";
    if (scale === 1 && file.size <= 4 * 1024 * 1024 && !mustConvert) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
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
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] ?? null;
  const [preview, setPreview] = useState<string | null>(null);
  const [project, setProject] = useState(projects[0] ?? "");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [jobNote, setJobNote] = useState("");
  const [housing, setHousing] = useState("");
  const [builtYear, setBuiltYear] = useState("");
  const [loadBearing, setLoadBearing] = useState("");
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

  /** Adds the chosen files (several pages or screenshots of the same quote). */
  function pick(list: FileList | File[] | null | undefined) {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    for (const f of picked) {
      const err = validate(f, t);
      if (err) return setError(err);
    }
    if (files.length + picked.length > MAX_FILES) return setError(d.errors.tooManyFiles);
    setError(null);
    setFiles([...files, ...picked]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return setError(t.errChoose);
    setBusy(true);
    setError(null);
    const fd = new FormData();
    for (const f of files) fd.append("file", await shrinkImage(f, files.length > 1));
    fd.append("projectName", project.trim());
    if (jobTypes.length) fd.append("jobTypes", jobTypes.join(","));
    if (jobNote.trim()) fd.append("jobNote", jobNote.trim());
    if (housing) fd.append("housing", housing);
    if (builtYear.trim()) fd.append("builtYear", builtYear.trim());
    if (loadBearing) fd.append("loadBearing", loadBearing);
    let res: Response;
    try {
      res = await fetch("/api/quotes", { method: "POST", body: fd });
    } catch {
      // The connection dropped (e.g. the phone locked). The analysis may still finish on the server,
      // so send the user to their quotes instead of letting them upload – and pay – twice.
      window.location.assign("/dashboard?afbrudt=1");
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.quote?.id) {
      setError(json.error || t.errFailed);
      setBusy(false);
      return;
    }
    setStep(STEPS.length);
    window.location.assign(`/dashboard/tilbud/${json.quote.id}`);
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
            pick(e.dataTransfer.files);
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
        <div className="space-y-2" data-testid="upload-files">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="card flex items-center gap-4 p-3 sm:p-4">
              {i === 0 && preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={t.previewAlt} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <FileText className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-sm text-ink-muted">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink"
                aria-label={t.removeFile}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
          {files.length > 1 && <p className="text-sm font-medium text-brand-800" data-testid="upload-files-count">{fmt(t.filesCount, { n: files.length })}</p>}
          {files.length < MAX_FILES && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary w-full" data-testid="upload-add-more">
                <Plus className="h-4 w-4" /> {t.addMore}
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary w-full sm:hidden">
                <Camera className="h-4 w-4" /> {t.camera}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="flex gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900" data-testid="one-quote-note">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t.oneQuote}</span>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
        data-testid="file-input"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />

      {!files.length && (
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

      <details className="group rounded-xl border border-line bg-white" data-testid="job-context">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium marker:hidden">
          <span className="flex items-center justify-between gap-3">
            {t.contextTitle}
            <Plus className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-45" />
          </span>
          <span className="mt-0.5 block text-xs font-normal text-ink-muted">{t.contextHelp}</span>
        </summary>
        <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="label">{t.jobTypes}</legend>
            <div className="flex flex-wrap gap-2" data-testid="job-types">
              {JOB_TYPES.map((j) => {
                const on = jobTypes.includes(j);
                return (
                  <label key={j} className={cn("cursor-pointer rounded-lg border px-3 py-2 text-sm", on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setJobTypes(on ? jobTypes.filter((x) => x !== j) : [...jobTypes, j])}
                      className="sr-only"
                    />
                    {t.jobTypeOptions[j]}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <label htmlFor="jobNote" className="label">{t.jobNote}</label>
            <input
              id="jobNote"
              value={jobNote}
              onChange={(e) => setJobNote(e.target.value)}
              maxLength={JOB_NOTE_MAX}
              className="input"
              placeholder={t.jobNotePlaceholder}
            />
          </div>
          <div>
            <label htmlFor="housing" className="label">{t.housing}</label>
            <select id="housing" value={housing} onChange={(e) => setHousing(e.target.value)} className="input">
              <option value="">{t.choose}</option>
              {HOUSING.map((h) => (
                <option key={h} value={h}>{t.housingOptions[h]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="builtYear" className="label">{t.builtYear}</label>
            <input
              id="builtYear"
              inputMode="numeric"
              pattern="[0-9]{4}"
              value={builtYear}
              onChange={(e) => setBuiltYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="input"
              placeholder="1972"
            />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="label">{t.loadBearing}</legend>
            <div className="flex flex-wrap gap-2">
              {LOAD_BEARING.map((v) => (
                <label key={v} className={cn("cursor-pointer rounded-lg border px-3 py-2 text-sm", loadBearing === v ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line")}>
                  <input
                    type="radio"
                    name="loadBearing"
                    value={v}
                    checked={loadBearing === v}
                    onChange={() => setLoadBearing(v)}
                    className="sr-only"
                  />
                  {t.loadBearingOptions[v]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={!files.length} className="btn-primary w-full py-3 text-base">
        {t.submit}
      </button>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        {plural(remaining, t.remainingOne, t.remainingOther)}
      </p>
      <p className="text-center text-xs text-ink-muted">{t.aiNote}</p>
    </form>
  );
}
