import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  MetricsExplorer,
  type MetricRow,
} from "@/components/dashboard/metrics-explorer";

const num = (v: unknown) => Number(v ?? 0);

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

export default async function MetricsPage() {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from("connections")
    .select("id")
    .maybeSingle();
  if (!connection) return null; // layout shows the connect screen

  const [{ data: metrics }, { data: adRows }, { data: campRows }] =
    await Promise.all([
      supabase
        .from("metrics_history")
        .select(
          "ad_id, campaign_id, date, impressions, clicks, spend, conversions, ctr, frequency",
        )
        .eq("connection_id", connection.id),
      supabase
        .from("ads")
        .select("platform_ad_id, name, creative_type, status, platform_campaign_id"),
      supabase.from("campaigns").select("platform_campaign_id, name"),
    ]);

  const adMap = new Map((adRows ?? []).map((a) => [a.platform_ad_id, a]));
  const campMap = new Map(
    (campRows ?? []).map((c) => [c.platform_campaign_id, c.name as string]),
  );

  // One flat row per ad × day, enriched with names / type / status.
  const rows: MetricRow[] = ((metrics ?? []) as RawMetric[]).map((m) => {
    const ad = adMap.get(m.ad_id);
    return {
      id: `${m.ad_id}_${m.date}`,
      date: m.date,
      adId: m.ad_id,
      adName: ad?.name ?? m.ad_id,
      adType: ad?.creative_type ?? "—",
      campaignName:
        campMap.get(ad?.platform_campaign_id ?? "") ?? m.campaign_id,
      status: ad?.status ?? "active",
      impressions: num(m.impressions),
      clicks: num(m.clicks),
      spend: num(m.spend),
      conversions: num(m.conversions),
      ctr: num(m.ctr),
      frequency: num(m.frequency),
    };
  });

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-lg font-semibold text-foreground">No metrics yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Run a sync from the overview to ingest performance data.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Go to overview
        </Link>
      </div>
    );
  }

  return <MetricsExplorer rows={rows} />;
}
