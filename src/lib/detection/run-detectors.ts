import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { RULES } from "./rules";
import {
  aggregate,
  computeWindows,
  inRange,
  type MetricSample,
} from "./windows";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// Each window needs at least this many days of data to be trustworthy.
// Guards against false positives on ads with too little history.
const MIN_WINDOW_DAYS = 3;

type RunDetectorsArgs = {
  admin: SupabaseAdmin;
  connectionId: string;
  userId: string;
  syncRunId: string;
};

type AdMeta = { name: string; campaignId: string | null };

const num = (v: unknown) => Number(v ?? 0);

// Runs every detection rule over the connection's stored metrics and turns
// findings into operator tasks. Idempotent on (connection_id, ad_id,
// rule_type, period): re-running updates evidence instead of duplicating.
export async function runDetectors({
  admin,
  connectionId,
  userId,
  syncRunId,
}: RunDetectorsArgs): Promise<{ tasksCreated: number }> {
  // 1) Load metrics for this connection.
  const { data: rows, error } = await admin
    .from("metrics_history")
    .select(
      "ad_id, campaign_id, date, impressions, clicks, spend, conversions, ctr, frequency",
    )
    .eq("connection_id", connectionId);
  if (error) throw new Error(`Detection read failed: ${error.message}`);
  if (!rows || rows.length === 0) return { tasksCreated: 0 };

  // 2) Ad metadata for friendly names in tasks.
  const { data: adRows } = await admin
    .from("ads")
    .select("platform_ad_id, name, platform_campaign_id")
    .eq("connection_id", connectionId);
  const adMeta = new Map<string, AdMeta>();
  for (const a of adRows ?? []) {
    adMeta.set(a.platform_ad_id, {
      name: a.name ?? a.platform_ad_id,
      campaignId: a.platform_campaign_id ?? null,
    });
  }

  // 3) Anchor windows on the most recent date in the dataset.
  const maxDate = rows.reduce(
    (max, r) => (r.date > max ? r.date : max),
    rows[0].date,
  );
  const windows = computeWindows(maxDate);

  // 4) Group samples by ad.
  const byAd = new Map<string, MetricSample[]>();
  for (const r of rows) {
    const sample: MetricSample = {
      date: r.date,
      impressions: num(r.impressions),
      clicks: num(r.clicks),
      spend: num(r.spend),
      conversions: num(r.conversions),
      ctr: num(r.ctr),
      frequency: num(r.frequency),
    };
    const list = byAd.get(r.ad_id);
    if (list) list.push(sample);
    else byAd.set(r.ad_id, [sample]);
  }

  let tasksCreated = 0;

  // 5) Evaluate each ad.
  for (const [adId, samples] of byAd) {
    const lastSamples = samples.filter((s) =>
      inRange(s.date, windows.lastStart, windows.lastEnd),
    );
    const priorSamples = samples.filter((s) =>
      inRange(s.date, windows.priorStart, windows.priorEnd),
    );
    const last = aggregate(lastSamples);
    const prior = aggregate(priorSamples);

    // Not enough history in either window -> skip honestly (and record why).
    if (last.days < MIN_WINDOW_DAYS || prior.days < MIN_WINDOW_DAYS) {
      await admin.from("events").insert({
        user_id: userId,
        connection_id: connectionId,
        sync_run_id: syncRunId,
        type: "detection_skipped",
        message: `Skipped ${adId}: insufficient data (last ${last.days}d, prior ${prior.days}d, need ${MIN_WINDOW_DAYS}).`,
        data: { ad_id: adId, last_days: last.days, prior_days: prior.days },
      });
      continue;
    }

    const meta = adMeta.get(adId) ?? { name: adId, campaignId: null };

    for (const rule of RULES) {
      const detection = rule.evaluate({
        adId,
        adName: meta.name,
        campaignId: meta.campaignId,
        last,
        prior,
        windows,
      });
      if (!detection) continue;

      const created = await upsertTask({
        admin,
        connectionId,
        userId,
        syncRunId,
        adId,
        campaignId: meta.campaignId,
        period: windows.period,
        detection,
      });
      if (created) tasksCreated += 1;
    }
  }

  return { tasksCreated };
}

// Inserts a new task or refreshes an existing one for the same period.
// Returns true only when a brand-new task is created.
async function upsertTask({
  admin,
  connectionId,
  userId,
  syncRunId,
  adId,
  campaignId,
  period,
  detection,
}: {
  admin: SupabaseAdmin;
  connectionId: string;
  userId: string;
  syncRunId: string;
  adId: string;
  campaignId: string | null;
  period: string;
  detection: import("./rules").Detection;
}): Promise<boolean> {
  const { data: existing } = await admin
    .from("tasks")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("ad_id", adId)
    .eq("rule_type", detection.ruleType)
    .eq("period", period)
    .maybeSingle();

  const nowIso = new Date().toISOString();

  // Atomic upsert on the idempotency key. `status` is intentionally omitted:
  // on insert it falls back to the column default ('open'); on conflict it is
  // left untouched, so an operator's resolve/dismiss is never overwritten by a
  // later sync. This is race-safe — a concurrent sync can't trigger a
  // duplicate-key error the way a check-then-insert could.
  const { data: row, error } = await admin
    .from("tasks")
    .upsert(
      {
        connection_id: connectionId,
        user_id: userId,
        ad_id: adId,
        campaign_id: campaignId,
        rule_type: detection.ruleType,
        period,
        title: detection.title,
        description: detection.description,
        severity: detection.severity,
        evidence: detection.evidence,
        last_detected_at: nowIso,
      },
      { onConflict: "connection_id,ad_id,rule_type,period" },
    )
    .select("id")
    .single();
  if (error || !row) {
    throw new Error(`Could not upsert task: ${error?.message}`);
  }

  // Audit: distinguish a brand-new task from a refreshed one (best-effort).
  await admin.from("events").insert({
    user_id: userId,
    connection_id: connectionId,
    sync_run_id: syncRunId,
    task_id: row.id,
    type: existing ? "task_updated" : "task_created",
    message: existing
      ? `Re-detected ${detection.ruleType} for ${adId}; evidence refreshed.`
      : detection.title,
    data: {
      ad_id: adId,
      rule_type: detection.ruleType,
      period,
      severity: detection.severity,
      evidence: detection.evidence,
    },
  });
  return !existing;
}
