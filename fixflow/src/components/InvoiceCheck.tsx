"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { shrinkImage } from "./UploadForm";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

/** "Tjek regningen": upload the invoice (one PDF or photos of its pages) and compare it with this quote. */
export function InvoiceCheckForm({ quoteId, remaining, again = false }: { quoteId: string; remaining: number; again?: boolean }) {
  const { d } = useI18n();
  const t = d.invoice;
  const u = d.upload;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    if (picked.length > MAX_FILES) return setError(d.errors.tooManyFiles);
    setError(null);
    setFiles(picked);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!files.length) return setError(d.errors.chooseFile);
    setBusy(true);
    setError(null);
    const fd = new FormData();
    // Several files are joined into one PDF on the server, which only takes JPEG and PNG.
    for (const f of files) fd.append("file", await shrinkImage(f, files.length > 1));
    try {
      const res = await fetch(`/api/quotes/${quoteId}/invoice`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || u.errFailed);
        setBusy(false);
        return;
      }
      setFiles([]);
      setBusy(false);
      router.refresh();
    } catch {
      setError(d.common.noConnection);
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center" aria-live="polite" data-testid="invoice-progress">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="font-semibold">{t.busy}</p>
        <p className="text-sm text-ink-muted">{t.busyHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6" data-testid="invoice-form">
      {!again && <p className="text-[15px] leading-relaxed text-ink-soft">{t.intro}</p>}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <FileText className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="break-all font-medium">{f.name}</p>
                <p className="text-sm text-ink-muted">{formatBytes(f.size)}</p>
              </div>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink" aria-label={u.removeFile}>
                <X className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary w-full">
        {files.length ? <Plus className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />} {files.length ? t.pickMore : t.pick}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        data-testid="invoice-file-input"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-sm text-ink-muted">{t.pickHint}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={!files.length || remaining <= 0} className="btn-primary w-full py-3 text-base">
        {t.submit}
      </button>
      <p className="text-center text-xs text-ink-muted">
        {remaining > 0 ? fmt(t.costNote, { n: remaining }) : t.noneLeft} {t.notStored}
      </p>
    </form>
  );
}

export function DeleteInvoiceCheckButton({ quoteId, checkId }: { quoteId: string; checkId: string }) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm(d.invoice.deleteConfirm)) return;
    setBusy(true);
    const res = await fetch(`/api/quotes/${quoteId}/invoice/${checkId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else window.alert(d.common.somethingWrong);
  }
  return (
    <button type="button" onClick={del} disabled={busy} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-red-700">
      <Trash2 className="h-4 w-4" /> {d.invoice.deleteCheck}
    </button>
  );
}
