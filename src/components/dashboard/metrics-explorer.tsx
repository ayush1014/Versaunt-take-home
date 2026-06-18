"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  fmtNumber,
  fmtCurrency,
  fmtPercent,
  fmtDecimal,
} from "@/lib/format";

export type MetricRow = {
  id: string;
  date: string;
  adId: string;
  adName: string;
  adType: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  frequency: number;
};

type FilterKey = "ad" | "campaign" | "adType" | "status";
type Filters = Record<FilterKey, string[]>;
type SortKey =
  | "date"
  | "adName"
  | "adType"
  | "campaignName"
  | "impressions"
  | "clicks"
  | "spend"
  | "ctr"
  | "frequency"
  | "conversions";

const PAGE_SIZE = 25;

const DATE_PRESETS = [
  { label: "All dates", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
];

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function addDays(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
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
        active
          ? "glass-control-active text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active ? <Check className="h-3 w-3" /> : null}
      {label}
    </button>
  );
}

export function MetricsExplorer({ rows }: { rows: MetricRow[] }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    ad: [],
    campaign: [],
    adType: [],
    status: [],
  });
  const [datePreset, setDatePreset] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(0);

  const adNames = useMemo(
    () => Array.from(new Set(rows.map((r) => r.adName))),
    [rows],
  );
  const campaigns = useMemo(
    () => Array.from(new Set(rows.map((r) => r.campaignName))),
    [rows],
  );
  const adTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.adType))),
    [rows],
  );
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status))),
    [rows],
  );
  const maxDate = useMemo(
    () => rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0]?.date ?? ""),
    [rows],
  );

  const toggle = (key: FilterKey, value: string) =>
    setFilters((f) => {
      const cur = f[key];
      return {
        ...f,
        [key]: cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value],
      };
    });

  const activeCount =
    filters.ad.length +
    filters.campaign.length +
    filters.adType.length +
    filters.status.length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const days = DATE_PRESETS[datePreset].days;
    const cutoff = days > 0 && maxDate ? addDays(maxDate, -(days - 1)) : null;

    const out = rows.filter((r) => {
      const matchSearch =
        !q ||
        r.adName.toLowerCase().includes(q) ||
        r.campaignName.toLowerCase().includes(q);
      const matchAd = filters.ad.length === 0 || filters.ad.includes(r.adName);
      const matchCampaign =
        filters.campaign.length === 0 || filters.campaign.includes(r.campaignName);
      const matchType =
        filters.adType.length === 0 || filters.adType.includes(r.adType);
      const matchStatus =
        filters.status.length === 0 || filters.status.includes(r.status);
      const matchDate = !cutoff || r.date >= cutoff;
      return (
        matchSearch &&
        matchAd &&
        matchCampaign &&
        matchType &&
        matchStatus &&
        matchDate
      );
    });

    const { key, dir } = sort;
    const mult = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
      return String(av).localeCompare(String(bv)) * mult;
    });
    return out;
  }, [rows, search, filters, datePreset, maxDate, sort]);

  // Reset to the first page whenever filters/sort change — React's recommended
  // "adjust state during render" pattern (no effect needed).
  const filterSig = JSON.stringify([search, filters, datePreset, sort]);
  const [lastSig, setLastSig] = useState(filterSig);
  if (filterSig !== lastSig) {
    setLastSig(filterSig);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const setSortKey = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" || key === "adName" ? "asc" : "desc" },
    );

  return (
    <section className="glass-card overflow-hidden rounded-2xl">
      {/* Header + search */}
      <div className="space-y-4 border-b border-border/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">Metrics</h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {rows.length} rows · ad × day
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ad or campaign…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Top filter bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(Number(e.target.value))}
            aria-label="Date range"
            className="glass-control h-8 rounded-full px-3 text-xs font-medium text-foreground outline-none focus:border-foreground/40"
          >
            {DATE_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <MultiSelect
            label="Ad"
            options={adNames}
            selected={filters.ad}
            onChange={(v) => setFilters((f) => ({ ...f, ad: v }))}
          />
          <MultiSelect
            label="Campaign"
            options={campaigns}
            selected={filters.campaign}
            onChange={(v) => setFilters((f) => ({ ...f, campaign: v }))}
          />
          <FilterGroup label="Type" values={adTypes} selected={filters.adType} onToggle={(v) => toggle("adType", v)} />
          <FilterGroup label="Status" values={statuses} selected={filters.status} onToggle={(v) => toggle("status", v)} />
          {activeCount > 0 ? (
            <button
              onClick={() => setFilters({ ad: [], campaign: [], adType: [], status: [] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear ({activeCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs text-muted-foreground">
              <SortHeader label="Date" k="date" sort={sort} onSort={setSortKey} />
              <SortHeader label="Ad" k="adName" sort={sort} onSort={setSortKey} />
              <SortHeader label="Type" k="adType" sort={sort} onSort={setSortKey} />
              <SortHeader label="Campaign" k="campaignName" sort={sort} onSort={setSortKey} />
              <SortHeader label="Impr." k="impressions" sort={sort} onSort={setSortKey} align="right" />
              <SortHeader label="Clicks" k="clicks" sort={sort} onSort={setSortKey} align="right" />
              <SortHeader label="Spend" k="spend" sort={sort} onSort={setSortKey} align="right" />
              <SortHeader label="CTR" k="ctr" sort={sort} onSort={setSortKey} align="right" />
              <SortHeader label="Freq." k="frequency" sort={sort} onSort={setSortKey} align="right" />
              <SortHeader label="Conv." k="conversions" sort={sort} onSort={setSortKey} align="right" />
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 transition hover:bg-foreground/[0.03]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {shortDate(r.date)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{r.adName}</td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{r.adType}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.campaignName}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{fmtNumber(r.impressions)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{fmtNumber(r.clicks)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{fmtCurrency(r.spend)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{fmtPercent(r.ctr)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{fmtDecimal(r.frequency, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{fmtNumber(r.conversions)}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={
                        r.status === "active"
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
        <span>
          {filtered.length === 0
            ? "0 rows"
            : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
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
    </section>
  );
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const activeSort = sort.key === k;
  const Icon = !activeSort
    ? ChevronsUpDown
    : sort.dir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <th className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 transition hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        } ${activeSort ? "text-foreground" : ""}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
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
