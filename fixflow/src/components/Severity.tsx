import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/format";

export const SEVERITY = {
  high: { label: "Vigtigt", badge: "bg-red-50 text-red-700 ring-1 ring-red-200", border: "border-l-red-500", icon: AlertTriangle, iconColor: "text-red-600" },
  medium: { label: "Bør afklares", badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", border: "border-l-amber-500", icon: AlertCircle, iconColor: "text-amber-600" },
  low: { label: "Godt at vide", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", border: "border-l-sky-500", icon: Info, iconColor: "text-sky-600" },
} as const;

export function SeverityBadge({ severity, label, className }: { severity: keyof typeof SEVERITY; label: string; className?: string }) {
  const s = SEVERITY[severity];
  return <span className={cn("badge", s.badge, className)}>{label}</span>;
}
