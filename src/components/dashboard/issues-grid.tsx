"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Check,
  X,
  Flame,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Clock,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { SeverityBadge } from "@/components/dashboard/badges";
import { updateTaskStatus } from "@/lib/tasks/actions";
import { fmtRelative } from "@/lib/format";
import type { TaskRuleType, TaskSeverity, TaskStatus } from "@/lib/types";

export type IssueView = {
  id: string;
  ad_id: string;
  campaign_id: string | null;
  adName: string;
  rule_type: TaskRuleType;
  severity: TaskSeverity;
  status: TaskStatus;
  title: string;
  description: string | null;
  evidence: Record<string, unknown>;
  last_detected_at: string;
};

const PAGE_SIZE = 20;

const RULE_META: Record<TaskRuleType, { label: string; Icon: LucideIcon; tint: string }> = {
  creative_fatigue: {
    label: "Creative fatigue",
    Icon: Flame,
    tint: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  spend_spike: {
    label: "Spend spike",
    Icon: TrendingUp,
    tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
};

const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  resolved: {
    label: "Resolved",
    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  dismissed: { label: "Dismissed", cls: "bg-foreground/5 text-muted-foreground" },
};

function evidenceChips(rule: TaskRuleType, ev: Record<string, unknown>): string[] {
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? NaN));
  const get = (k: string) => ev[k] as Record<string, unknown> | undefined;
  if (rule === "creative_fatigue") {
    const ctr = get("ctr");
    const freq = get("frequency");
    const out: string[] = [];
    if (ctr) out.push(`CTR ${n(ctr.change_pct).toFixed(0)}%`);
    if (freq) out.push(`Freq +${n(freq.delta).toFixed(1)}`);
    return out;
  }
  const spend = get("spend");
  const conv = get("conversions");
  const out: string[] = [];
  if (spend) out.push(`Spend +${n(spend.change_pct).toFixed(0)}%`);
  if (conv) out.push(`Conv ${n(conv.change_pct).toFixed(0)}%`);
  return out;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`glass-control inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${
        active ? "glass-control-active text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active ? <Check className="h-3 w-3" /> : null}
      {label.replace("_", " ")}
    </button>
  );
}

export function IssuesGrid({ issues }: { issues: IssueView[] }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string[]>([]);
  const [rule, setRule] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const severities = useMemo(
    () => Array.from(new Set(issues.map((i) => i.severity))),
    [issues],
  );
  const rules = useMemo(
    () => Array.from(new Set(issues.map((i) => i.rule_type))),
    [issues],
  );
  const statuses = useMemo(
    () => Array.from(new Set(issues.map((i) => i.status))),
    [issues],
  );

  const toggle =
    (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
      set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const activeCount = severity.length + rule.length + status.length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return issues.filter((i) => {
      const matchSearch =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.adName.toLowerCase().includes(q);
      const matchSev = severity.length === 0 || severity.includes(i.severity);
      const matchRule = rule.length === 0 || rule.includes(i.rule_type);
      const matchStatus = status.length === 0 || status.includes(i.status);
      return matchSearch && matchSev && matchRule && matchStatus;
    });
  }, [issues, search, severity, rule, status]);

  // Reset to first page when filters change (render-time pattern).
  const sig = JSON.stringify([search, severity, rule, status]);
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const openCount = issues.filter((i) => i.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Header + glass search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Issues
            </h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {issues.length} · {openCount} open
            </p>
          </div>
          <div className="glass-control flex h-9 w-full max-w-xs items-center gap-2 rounded-full px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="h-full w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FilterGroup label="Severity" values={severities} selected={severity} onToggle={toggle(setSeverity)} />
          <FilterGroup label="Type" values={rules} selected={rule} onToggle={toggle(setRule)} />
          <FilterGroup label="Status" values={statuses} selected={status} onToggle={toggle(setStatus)} />
          {activeCount > 0 ? (
            <button
              onClick={() => {
                setSeverity([]);
                setRule([]);
                setStatus([]);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear ({activeCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 rounded-2xl px-5 py-16 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            {issues.length === 0
              ? "No issues detected. Run a sync to evaluate performance."
              : "No issues match your filters."}
          </p>
        </div>
      ) : (
        <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {pageItems.map((issue, i) => (
              <IssueCard key={issue.id} issue={issue} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {filtered.length > 0 ? (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="glass-control inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="glass-control inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IssueCard({ issue, index }: { issue: IssueView; index: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const rule = RULE_META[issue.rule_type];
  const RuleIcon = rule.Icon;
  const statusMeta = STATUS_META[issue.status];

  function set(next: TaskStatus) {
    startTransition(async () => {
      await updateTaskStatus(issue.id, next);
      router.refresh();
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -3 }}
      className={`glass-card glass-card-hover flex flex-col gap-3 rounded-2xl p-5 ${
        issue.status !== "open" ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${rule.tint}`}>
          <RuleIcon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <SeverityBadge severity={issue.severity} />
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">{issue.title}</h3>
        {issue.description ? (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {issue.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {evidenceChips(issue.rule_type, issue.evidence).map((chip) => (
          <span
            key={chip}
            className="rounded-md bg-foreground/5 px-2 py-0.5 font-mono text-xs tabular-nums text-foreground/80"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {fmtRelative(issue.last_detected_at)}
        </span>
        <div className="flex items-center gap-1.5">
          {issue.status === "open" ? (
            <>
              <button
                onClick={() => set("resolved")}
                disabled={pending}
                className="glass-control inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-emerald-600 disabled:opacity-50 dark:text-emerald-400"
              >
                <Check className="h-3.5 w-3.5" /> Resolve
              </button>
              <button
                onClick={() => set("dismissed")}
                disabled={pending}
                className="glass-control inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> Dismiss
              </button>
            </>
          ) : (
            <button
              onClick={() => set("open")}
              disabled={pending}
              className="glass-control inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-foreground disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reopen
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FilterGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      {values.map((v) => (
        <Chip key={v} label={v} active={selected.includes(v)} onClick={() => onToggle(v)} />
      ))}
    </div>
  );
}
