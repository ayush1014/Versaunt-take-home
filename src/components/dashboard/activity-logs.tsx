"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";

const PAGE_SIZE = 25;

export type ActivityEvent = {
  id: number;
  type: string;
  message: string | null;
  created_at: string;
  data: Record<string, unknown>;
};

type Level = "info" | "warning" | "error";
type Filters = { level: string[]; category: string[]; type: string[] };

// --- Derive log-style fields from an event ------------------------------
function levelOf(type: string): Level {
  if (type.includes("failed")) return "error";
  if (type.includes("partial") || type.includes("retry") || type.includes("skipped"))
    return "warning";
  return "info";
}
function categoryOf(type: string): string {
  if (type.startsWith("sync")) return "sync";
  if (type.startsWith("task")) return "task";
  if (type.startsWith("detection")) return "detection";
  if (type.startsWith("account")) return "account";
  return "system";
}

const levelBadge: Record<Level, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const levelText: Record<Level, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};

// All formatted on the client → uses the device's local timezone. UTC is in
// the DB; suppressHydrationWarning avoids an SSR(UTC)/client(local) mismatch.
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  });
const fmtUTC = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  });

function EventRow({
  event,
  expanded,
  onToggle,
}: {
  event: ActivityEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const level = levelOf(event.type);
  const category = categoryOf(event.type);
  const dataEntries = Object.entries(event.data ?? {});

  return (
    <>
      <button
        onClick={onToggle}
        className="glass-hover w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-4">
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.span>

          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${levelBadge[level]}`}
          >
            {level}
          </span>

          <time
            suppressHydrationWarning
            className="w-24 shrink-0 font-mono text-xs text-muted-foreground"
          >
            {fmtTime(event.created_at)}
          </time>

          <span className="shrink-0 text-sm font-medium capitalize text-foreground">
            {category}
          </span>

          <p className="flex-1 truncate text-sm text-muted-foreground">
            {event.message ?? event.type}
          </p>

          <span className={`hidden shrink-0 font-mono text-xs sm:block ${levelText[level]}`}>
            {event.type}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/50 bg-foreground/[0.02]"
          >
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message
                </p>
                <p className="rounded-lg border border-border/50 bg-background/60 p-3 text-sm text-foreground">
                  {event.message ?? event.type}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Local time
                  </p>
                  <p suppressHydrationWarning className="font-mono text-xs text-foreground">
                    {fmtFull(event.created_at)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    UTC (stored)
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {fmtUTC(event.created_at)}
                  </p>
                </div>
              </div>

              {dataEntries.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Details
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dataEntries.map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-md border border-border/60 px-2 py-0.5 font-mono text-xs text-foreground/80"
                      >
                        {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function FilterButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ x: 2 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`glass-control flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm capitalize ${
        selected ? "glass-control-active text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      {selected ? <Check className="h-3.5 w-3.5" /> : null}
    </motion.button>
  );
}

export function ActivityLogs({ events }: { events: ActivityEvent[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    level: [],
    category: [],
    type: [],
  });

  const levels = useMemo(
    () => Array.from(new Set(events.map((e) => levelOf(e.type)))),
    [events],
  );
  const categories = useMemo(
    () => Array.from(new Set(events.map((e) => categoryOf(e.type)))),
    [events],
  );
  const types = useMemo(
    () => Array.from(new Set(events.map((e) => e.type))),
    [events],
  );

  const toggle = (key: keyof Filters, value: string) =>
    setFilters((f) => {
      const cur = f[key];
      return {
        ...f,
        [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });

  const activeFilters =
    filters.level.length + filters.category.length + filters.type.length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter((e) => {
      const matchSearch =
        !q ||
        (e.message ?? "").toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q);
      const matchLevel =
        filters.level.length === 0 || filters.level.includes(levelOf(e.type));
      const matchCategory =
        filters.category.length === 0 ||
        filters.category.includes(categoryOf(e.type));
      const matchType = filters.type.length === 0 || filters.type.includes(e.type);
      return matchSearch && matchLevel && matchCategory && matchType;
    });
  }, [events, search, filters]);

  // Reset to the first page when filters/search change; then paginate.
  const sig = JSON.stringify([search, filters]);
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="space-y-4 border-b border-border/60 p-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Activity
          </h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? "No events"
              : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} events`}
          </p>
        </div>

        <div className="flex gap-2">
          <div className="glass-control flex h-9 flex-1 items-center gap-2 rounded-full px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by message or type…"
              className="h-full w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-label="Toggle filters"
            className={`glass-control relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground ${
              showFilters ? "glass-control-active" : ""
            }`}
          >
            <Filter className="h-4 w-4" />
            {activeFilters > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {activeFilters}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Body: filter panel + list */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {showFilters ? (
            <motion.div
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden border-r border-border/60"
            >
              <div className="flex h-full w-[260px] flex-col gap-6 overflow-y-auto p-4">
                <FilterSection label="Level" values={levels} selected={filters.level} onToggle={(v) => toggle("level", v)} />
                <FilterSection label="Category" values={categories} selected={filters.category} onToggle={(v) => toggle("category", v)} />
                <FilterSection label="Type" values={types} selected={filters.type} onToggle={(v) => toggle("type", v)} />
                {activeFilters > 0 ? (
                  <button
                    onClick={() => setFilters({ level: [], category: [], type: [] })}
                    className="text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              {events.length === 0
                ? "No activity yet. Run a sync to generate events."
                : "No events match your filters."}
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {pageItems.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  expanded={expandedId === event.id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === event.id ? null : event.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination footer */}
      {filtered.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
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

function FilterSection({
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
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2">
        {values.map((v) => (
          <FilterButton
            key={v}
            label={v.replace(/_/g, " ")}
            selected={selected.includes(v)}
            onClick={() => onToggle(v)}
          />
        ))}
      </div>
    </div>
  );
}
