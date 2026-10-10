import { cn } from "@/lib/format";

export function scoreColor(score: number) {
  if (score >= 80) return { stroke: "#2f8468", text: "text-brand-700", bg: "bg-brand-50", bar: "bg-brand-500" };
  if (score >= 60) return { stroke: "#4ea283", text: "text-brand-600", bg: "bg-brand-50", bar: "bg-brand-400" };
  if (score >= 40) return { stroke: "#d97706", text: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500" };
  return { stroke: "#dc2626", text: "text-red-700", bg: "bg-red-50", bar: "bg-red-500" };
}

export function ScoreRing({
  score,
  size = 132,
  label,
  srText,
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  /** Screen-reader text, e.g. "Tilbudsscore 36 ud af 100" in the viewer's language. */
  srText?: string;
  className?: string;
}) {
  const stroke = Math.max(6, Math.round(size / 13));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ecebe5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="num font-display font-semibold leading-none text-ink" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        {label && (
          <span className={cn("mt-1 font-medium leading-tight", color.text)} style={{ fontSize: Math.max(10, size * 0.085) }}>
            {label}
          </span>
        )}
      </div>
      {srText && <span className="sr-only">{srText}{label ? `, ${label}` : ""}</span>}
    </div>
  );
}
