import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { SeverityBadge } from "@/components/dashboard/badges";
import { TaskActions } from "@/components/dashboard/task-actions";
import { fmtRelative } from "@/lib/format";
import type { TaskRuleType, TaskSeverity, TaskStatus } from "@/lib/types";

export type TaskView = {
  id: string;
  ad_id: string;
  rule_type: TaskRuleType;
  severity: TaskSeverity;
  status: TaskStatus;
  title: string;
  description: string | null;
  evidence: Record<string, unknown>;
  last_detected_at: string;
};

// Pulls a couple of human-readable evidence chips out of the stored JSON.
function evidenceChips(rule: TaskRuleType, ev: Record<string, unknown>): string[] {
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? NaN));
  const get = (k: string) => ev[k] as Record<string, unknown> | undefined;

  if (rule === "creative_fatigue") {
    const ctr = get("ctr");
    const freq = get("frequency");
    const chips: string[] = [];
    if (ctr) chips.push(`CTR ${num(ctr.change_pct).toFixed(0)}%`);
    if (freq) chips.push(`Freq +${num(freq.delta).toFixed(1)}`);
    return chips;
  }
  if (rule === "spend_spike") {
    const spend = get("spend");
    const conv = get("conversions");
    const chips: string[] = [];
    if (spend) chips.push(`Spend +${num(spend.change_pct).toFixed(0)}%`);
    if (conv) chips.push(`Conv ${num(conv.change_pct).toFixed(0)}%`);
    return chips;
  }
  return [];
}

export function TaskList({ tasks }: { tasks: TaskView[] }) {
  const openCount = tasks.filter((t) => t.status === "open").length;

  return (
    <section id="issues" className="glass-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Flagged issues
            </h2>
            <p className="text-xs text-muted-foreground">
              Detected from stored metrics
            </p>
          </div>
        </div>
        <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {openCount} open
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            No issues detected. Run a sync to evaluate performance.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {tasks.map((t) => (
            <li
              key={t.id}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row ${t.status !== "open" ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t.title}
                  </span>
                  <SeverityBadge severity={t.severity} />
                  {t.status !== "open" ? (
                    <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground">
                      {t.status}
                    </span>
                  ) : null}
                </div>
                {t.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {evidenceChips(t.rule_type, t.evidence).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md bg-foreground/5 px-2 py-0.5 font-mono text-xs tabular-nums text-foreground/80"
                    >
                      {chip}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    · detected {fmtRelative(t.last_detected_at)}
                  </span>
                </div>
                </div>
              </div>
              <div className="shrink-0 pl-4 sm:self-center sm:pl-0">
                <TaskActions taskId={t.id} status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
