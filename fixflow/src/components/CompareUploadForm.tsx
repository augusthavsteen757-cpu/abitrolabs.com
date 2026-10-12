"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Plus, UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { shrinkImage } from "./UploadForm";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Upload 2–3 quotes for the same job in one go. They are analysed one after the other (so a failed or
 * dropped request never charges twice) and the user lands on the comparison of the ones that worked.
 */
export function CompareUploadForm({ remaining, defaultProject }: { remaining: number; defaultProject: string }) {
  const { d } = useI18n();
  const t = d.compare;
  const u = d.upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [project, setProject] = useState(defaultProject);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    const picked = [...files];
    for (const f of Array.from(list)) {
      const okType = ACCEPT.split(",").includes(f.type) || (f.type === "" && /\.(pdf|jpe?g|png|webp)$/i.test(f.name));
      if (!okType) return setError(u.errType);
      if (f.size > MAX_SIZE) return setError(u.errSize);
      if (f.size === 0) return setError(u.errEmpty);
      picked.push(f);
    }
    if (picked.length > MAX_FILES) return setError(t.maxThree);
    setError(null);
    setFiles(picked);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length < 2) return setError(t.needTwoFiles);
    if (files.length > remaining) return setError(fmt(t.notEnough, { n: remaining, m: files.length }));
    setBusy(true);
    setError(null);
    const ids: string[] = [];
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setCurrent(i + 1);
      const fd = new FormData();
      fd.append("file", await shrinkImage(files[i]));
      fd.append("projectName", project.trim() || defaultProject);
      try {
        const res = await fetch("/api/quotes", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.quote?.status === "DONE") ids.push(json.quote.id);
        else if (!res.ok && i === 0) {
          // Nothing was analysed (e.g. no analyses left): show why and stay on the form.
          setError(json.error || u.errFailed);
          setBusy(false);
          return;
        } else failed++;
      } catch {
        // Connection lost: the analysis may still finish – send the user to their quotes instead of paying twice.
        window.location.assign("/dashboard?afbrudt=1");
        return;
      }
    }
    // Ids are URL-safe (base64url), so they can be joined with plain commas.
    const failedParam = failed ? `&fejlet=${failed}` : "";
    window.location.assign(ids.length >= 2 ? `/dashboard/sammenlign?ids=${ids.join(",")}${failedParam}` : "/dashboard");
  }

  if (busy) {
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center" aria-live="polite" data-testid="compare-progress">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-lg font-semibold">{fmt(t.progress, { i: current, n: files.length })}</p>
        <p className="text-sm text-ink-muted">{u.waitingText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {files.length > 0 && (
        <ul className="space-y-2" data-testid="compare-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="card flex items-center gap-3 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-sm text-ink-muted">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink"
                aria-label={u.removeFile}
              >
                <X className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length < MAX_FILES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={files.length === 0 ? "flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-line bg-white px-6 py-10 text-center hover:border-brand-300 hover:bg-brand-50/40" : "btn-secondary w-full"}
        >
          {files.length === 0 ? (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <UploadCloud className="h-6 w-6" />
              </span>
              <span className="mt-3 text-lg font-semibold text-brand-700 underline underline-offset-4">{t.pickFiles}</span>
              <span className="mt-1 text-sm text-ink-muted">{u.fileTypes}</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {t.pickMore}
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        data-testid="compare-file-input"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      {files.length > 0 && <p className="text-sm text-ink-muted">{fmt(t.filesCount, { n: files.length })}</p>}

      <div>
        <label htmlFor="compare-project" className="label">{u.project}</label>
        <input id="compare-project" value={project} onChange={(e) => setProject(e.target.value)} maxLength={80} className="input" placeholder={u.projectPlaceholder} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={files.length < 2} className="btn-primary w-full py-3 text-base">
        {t.compareSubmit}
      </button>
      <p className="text-center text-xs text-ink-muted">{u.aiNote}</p>
    </form>
  );
}
