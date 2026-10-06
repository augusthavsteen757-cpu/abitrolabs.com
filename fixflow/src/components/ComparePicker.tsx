"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn, formatKr } from "@/lib/format";

type Item = { id: string; label: string; project: string; total: number | null };

export function ComparePicker({ items, selected }: { items: Item[]; selected: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(selected);

  function toggle(id: string) {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]));
  }

  const projects = [...new Set(items.map((i) => i.project))];
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">Vælg 2–4 tilbud</p>
        <button
          type="button"
          disabled={ids.length < 2}
          onClick={() => router.push(`/dashboard/sammenlign?ids=${ids.join(",")}`)}
          className="btn-primary"
        >
          Sammenlign {ids.length > 0 ? ids.length : ""} tilbud
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {projects.map((p) => (
          <fieldset key={p}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{p}</legend>
            <div className="flex flex-wrap gap-2">
              {items
                .filter((i) => i.project === p)
                .map((i) => {
                  const on = ids.includes(i.id);
                  return (
                    <label
                      key={i.id}
                      className={cn(
                        "flex max-w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                        on ? "border-brand-500 bg-brand-50 text-brand-900" : "border-line bg-white hover:border-brand-300",
                      )}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(i.id)} className="h-4 w-4 accent-brand-700" />
                      <span className="truncate">{i.label}</span>
                      <span className="num shrink-0 text-ink-muted">{formatKr(i.total)}</span>
                    </label>
                  );
                })}
            </div>
          </fieldset>
        ))}
      </div>
      {ids.length >= 4 && <p className="mt-3 text-xs text-ink-muted">Du kan højst sammenligne 4 tilbud ad gangen.</p>}
    </div>
  );
}
