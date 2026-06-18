import {
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SyncPanel } from "@/components/dashboard/sync-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { MetricsTable, type MetricRowView } from "@/components/dashboard/metrics-table";
import { TaskList, type TaskView } from "@/components/dashboard/task-list";
import { EventsTimeline, type EventView } from "@/components/dashboard/events-timeline";
import { SyncStatusBadge, Pill } from "@/components/dashboard/badges";
import { fmtNumber, fmtCurrency, fmtRelative } from "@/lib/format";
import type { SyncStatus } from "@/lib/types";

const num = (v: unknown) => Number(v ?? 0);
const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 } as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: connection } = await supabase
    .from("connections")
    .select("id, account_id, account_name, platform, status")
    .maybeSingle();

  // The layout guarantees a connection here; guard defensively.
  if (!connection) return null;

  // Connected — load everything in parallel.
  const [
    { data: latestRun },
    { data: metrics },
    { data: adRows },
    { data: campRows },
    { data: taskRows },
    { data: eventRows },
  ] = await Promise.all([
    supabase
      .from("sync_runs")
      .select(
        "status, started_at, completed_at, pages_fetched, total_pages, rows_upserted, tasks_created, error_message, trigger",
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("metrics_history")
      .select(
        "ad_id, campaign_id, date, impressions, clicks, spend, conversions, ctr, frequency",
      )
      .eq("connection_id", connection.id),
    supabase
      .from("ads")
      .select("platform_ad_id, name, creative_type, platform_campaign_id"),
    supabase.from("campaigns").select("platform_campaign_id, name"),
    supabase
      .from("tasks")
      .select(
        "id, ad_id, rule_type, severity, status, title, description, evidence, last_detected_at",
      ),
    supabase
      .from("events")
      .select("id, type, message, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const adMap = new Map(
    (adRows ?? []).map((a) => [a.platform_ad_id, a]),
  );
  const campMap = new Map(
    (campRows ?? []).map((c) => [c.platform_campaign_id, c.name as string]),
  );

  // Latest snapshot per ad (computed from history — single source of truth).
  type RawMetric = {
    ad_id: string;
    campaign_id: string;
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
    frequency: number;
  };
  const latestByAd = new Map<string, RawMetric>();
  for (const m of (metrics ?? []) as RawMetric[]) {
    const cur = latestByAd.get(m.ad_id);
    if (!cur || m.date > cur.date) latestByAd.set(m.ad_id, m);
  }

  const metricRows: MetricRowView[] = [...latestByAd.values()]
    .map((m) => {
      const ad = adMap.get(m.ad_id);
      return {
        adId: m.ad_id,
        adName: ad?.name ?? m.ad_id,
        campaignName: campMap.get(m.campaign_id) ?? m.campaign_id,
        creativeType: ad?.creative_type ?? null,
        date: m.date,
        impressions: num(m.impressions),
        clicks: num(m.clicks),
        spend: num(m.spend),
        conversions: num(m.conversions),
        ctr: num(m.ctr),
        frequency: num(m.frequency),
      };
    })
    .sort((a, b) => b.spend - a.spend);

  // Connected but nothing ingested yet — minimal empty state: just Sync now.
  if (metricRows.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Your dashboard is empty
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Run your first sync to ingest performance data and surface issues.
          </p>
        </div>
        <SyncPanel showSimulator={false} />
      </div>
    );
  }

  // Aggregate stats from the current snapshot.
  const totals = metricRows.reduce(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      conversions: acc.conversions + r.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
  );

  const tasks: TaskView[] = ((taskRows ?? []) as TaskView[])
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sev !== 0) return sev;
      return a.last_detected_at < b.last_detected_at ? 1 : -1;
    });
  const openIssues = tasks.filter((t) => t.status === "open").length;
  const events = (eventRows ?? []) as EventView[];

  return (
    <div className="space-y-3">
      {/* Overview header */}
      <section id="overview" className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {connection.account_name}
            </h1>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {connection.account_id} · {connection.platform}
            </p>
          </div>
          <Pill tone={connection.status === "active" ? "good" : "bad"}>
            {connection.status}
          </Pill>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <SyncPanel />
          {latestRun ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 whitespace-nowrap">
                Last sync:
                <SyncStatusBadge status={latestRun.status as SyncStatus} />
              </span>
              <span className="font-mono text-xs">
                {fmtRelative(latestRun.completed_at ?? latestRun.started_at)} ·{" "}
                {latestRun.pages_fetched}/{latestRun.total_pages ?? "?"} pages ·{" "}
                {fmtNumber(num(latestRun.rows_upserted))} rows
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No sync yet.</span>
          )}
        </div>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Spend" value={fmtCurrency(totals.spend)} icon={DollarSign} sub="current snapshot" />
        <StatCard label="Impressions" value={fmtNumber(totals.impressions)} icon={Eye} sub="current snapshot" />
        <StatCard label="Clicks" value={fmtNumber(totals.clicks)} icon={MousePointerClick} sub="current snapshot" />
        <StatCard label="Conversions" value={fmtNumber(totals.conversions)} icon={Target} sub="current snapshot" />
        <StatCard label="Open issues" value={String(openIssues)} icon={AlertTriangle} sub={`${tasks.length} total`} />
      </div>

      {/* Flagged issues */}
      <TaskList tasks={tasks} />

      {/* Metrics + activity side by side on wide screens */}
      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <MetricsTable rows={metricRows} />
        <EventsTimeline events={events} viewAllHref="/activity" />
      </div>
    </div>
  );
}
