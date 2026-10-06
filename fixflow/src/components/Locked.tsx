import { Lock } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Placeholder for paid content. Renders fake grey bars – the real text is never sent to the browser,
 * so the lock can't be removed with developer tools.
 */
export function Locked({
  lines = 2,
  label = "Låst",
  className,
  asLink = true,
}: {
  lines?: number;
  label?: string;
  className?: string;
  /** false when the placeholder already sits inside a link (links can't be nested). */
  asLink?: boolean;
}) {
  const widths = ["92%", "78%", "85%", "64%", "88%"];
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="space-y-2 py-1 blur-[3px]">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-ink/15" style={{ width: widths[i % widths.length] }} />
        ))}
      </div>
      {asLink ? (
        <a href="#laas-op" className="absolute inset-0 flex items-center justify-center" aria-label={`${label} – lås op for at se`}>
          <Badge label={label} />
        </a>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <Badge label={label} />
        </span>
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="badge bg-white/95 text-ink shadow-card ring-1 ring-line">
      <Lock className="h-3 w-3" /> {label}
    </span>
  );
}
