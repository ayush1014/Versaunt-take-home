import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { SyncStatus, TaskSeverity } from "@/lib/types";

const SYNC_STYLES: Record<
  SyncStatus,
  { label: string; cls: string; icon: LucideIcon }
> = {
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    cls: "bg-amber-50 text-amber-700 ring-amber-600/20",
    icon: AlertTriangle,
  },
  failed: {
    label: "Failed",
    cls: "bg-red-50 text-red-700 ring-red-600/20",
    icon: XCircle,
  },
  running: {
    label: "Running",
    cls: "bg-blue-50 text-blue-700 ring-blue-600/20",
    icon: Loader2,
  },
};

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const s = SYNC_STYLES[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />
      {s.label}
    </span>
  );
}

const SEVERITY_STYLES: Record<TaskSeverity, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-red-50 text-red-700 ring-red-600/20" },
  warning: { label: "Warning", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  info: { label: "Info", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
};

export function SeverityBadge({ severity }: { severity: TaskSeverity }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

// Small neutral pill for connection status / counts.
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "bad";
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : tone === "bad"
        ? "bg-red-50 text-red-700 ring-red-600/20"
        : "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}
