import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fmtRelative } from "@/lib/format";

export type EventView = {
  id: number;
  type: string;
  message: string | null;
  created_at: string;
};

// Colour the timeline dot by event category.
function dotClass(type: string): string {
  if (type.includes("failed")) return "bg-red-500";
  if (type.includes("partial") || type.includes("retry")) return "bg-amber-500";
  if (type === "task_created") return "bg-amber-500";
  if (type.includes("completed") || type === "account_connected")
    return "bg-emerald-500";
  if (type.startsWith("task")) return "bg-blue-500";
  return "bg-foreground/30";
}

export function EventsTimeline({
  events,
  viewAllHref,
}: {
  events: EventView[];
  viewAllHref?: string;
}) {
  return (
    <section id="activity" className="glass-card flex flex-col rounded-2xl">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <p className="text-xs text-muted-foreground">
          Audit trail — why things happened
        </p>
      </div>

      {events.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <ul className="px-5 py-2">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 py-2.5">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass(e.type)}`} />
                <span className="mt-1 w-px flex-1 bg-border/60" />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm text-foreground">{e.message ?? e.type}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {e.type} · {fmtRelative(e.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewAllHref ? (
        <div className="mt-auto border-t border-border/60 px-5 py-3">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:gap-2.5"
          >
            View all activity
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
