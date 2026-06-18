import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMetricsPage, PlatformError } from "@/lib/sync/mock-client";
import { runDetectors } from "@/lib/detection/run-detectors";
import type { MetricRow, SyncStatus } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type SyncResult = {
  syncRunId: string;
  status: SyncStatus;
  pagesFetched: number;
  totalPages: number | null;
  rowsUpserted: number;
  tasksCreated: number;
  errorCode?: string;
  errorMessage?: string;
};

type RunSyncArgs = {
  connectionId: string;
  userId: string;
  accountId: string;
  origin: string;
  trigger: "manual" | "cron";
  fail?: string | null;
};

// Writes one batch of metric rows idempotently on (connection_id, ad_id, date).
async function upsertMetrics(
  admin: SupabaseAdmin,
  connectionId: string,
  userId: string,
  rows: MetricRow[],
) {
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    connection_id: connectionId,
    user_id: userId,
    account_id: r.account_id,
    campaign_id: r.campaign_id,
    ad_id: r.ad_id,
    date: r.date,
    impressions: r.impressions,
    clicks: r.clicks,
    spend: r.spend,
    conversions: r.conversions,
    ctr: r.ctr,
    frequency: r.frequency,
  }));
  const { error } = await admin
    .from("metrics_history")
    .upsert(payload, { onConflict: "connection_id,ad_id,date" });
  if (error) throw new Error(`Failed to persist metrics: ${error.message}`);
}

async function logEvent(
  admin: SupabaseAdmin,
  fields: {
    userId: string;
    connectionId: string;
    syncRunId: string;
    type: string;
    message?: string;
    data?: Record<string, unknown>;
  },
) {
  await admin.from("events").insert({
    user_id: fields.userId,
    connection_id: fields.connectionId,
    sync_run_id: fields.syncRunId,
    type: fields.type,
    message: fields.message,
    data: fields.data ?? {},
  });
}

// Core sync pipeline. Fetches all pages, persists idempotently, records an
// honest status, writes an audit trail, and runs detection on the fresh data.
export async function runSync(args: RunSyncArgs): Promise<SyncResult> {
  const { connectionId, userId, accountId, origin, trigger, fail } = args;
  const admin = createAdminClient();

  // Reap stale runs: if a previous run crashed and was left "running", mark
  // any older than 2 minutes as failed so the UI never shows it stuck forever.
  await admin
    .from("sync_runs")
    .update({
      status: "failed",
      error_code: "STALE_RUN",
      error_message: "Run did not finish; superseded by a new sync.",
      completed_at: new Date().toISOString(),
    })
    .eq("connection_id", connectionId)
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());

  // 1) Open a sync run.
  const { data: run, error: runErr } = await admin
    .from("sync_runs")
    .insert({
      connection_id: connectionId,
      user_id: userId,
      status: "running",
      trigger,
    })
    .select("id")
    .single();
  if (runErr || !run) {
    throw new Error(`Could not start sync run: ${runErr?.message}`);
  }
  const syncRunId = run.id as string;

  await logEvent(admin, {
    userId,
    connectionId,
    syncRunId,
    type: "sync_started",
    message: `Sync started (${trigger})${fail ? ` with simulated fail=${fail}` : ""}`,
    data: { trigger, fail: fail ?? null },
  });

  let pagesFetched = 0;
  let totalPages: number | null = null;
  let rowsUpserted = 0;
  let status: SyncStatus = "running";
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  try {
    // 2) Page 1 establishes total_pages.
    const first = await fetchMetricsPage(origin, accountId, 1, fail ?? null);
    totalPages = first.page.total_pages;
    await upsertMetrics(admin, connectionId, userId, first.page.data);
    pagesFetched = 1;
    rowsUpserted += first.page.data.length;
    await logEvent(admin, {
      userId,
      connectionId,
      syncRunId,
      type: "sync_page_fetched",
      message: `Fetched page 1/${totalPages}${first.retried ? " (after retry)" : ""}`,
      data: { page: 1, rows: first.page.data.length, attempts: first.attempts },
    });

    // 3) Remaining pages.
    for (let page = 2; page <= totalPages; page++) {
      const result = await fetchMetricsPage(origin, accountId, page, fail ?? null);
      await upsertMetrics(admin, connectionId, userId, result.page.data);
      pagesFetched += 1;
      rowsUpserted += result.page.data.length;
      await logEvent(admin, {
        userId,
        connectionId,
        syncRunId,
        type: "sync_page_fetched",
        message: `Fetched page ${page}/${totalPages}${result.retried ? " (after retry)" : ""}`,
        data: { page, rows: result.page.data.length, attempts: result.attempts },
      });
    }

    status = "completed";
  } catch (err) {
    const platformErr = err instanceof PlatformError ? err : null;
    errorCode = platformErr?.code ?? "SYNC_ERROR";
    errorMessage = err instanceof Error ? err.message : "Unknown sync error.";

    // Auth expired is terminal — flag the connection so the UI tells the
    // operator to reconnect.
    if (platformErr?.status === 401) {
      status = "failed";
      await admin
        .from("connections")
        .update({ status: "auth_expired" })
        .eq("id", connectionId);
    } else {
      // Some pages saved -> partial; nothing saved -> failed.
      status = pagesFetched > 0 ? "partial" : "failed";
    }
  }

  // 4) Run detection on whatever fresh data we have (completed or partial).
  // A detection failure must never strand the run as "running" — catch it,
  // record it, and still finalize the run below.
  let tasksCreated = 0;
  if (status === "completed" || status === "partial") {
    try {
      const detection = await runDetectors({
        admin,
        connectionId,
        userId,
        syncRunId,
      });
      tasksCreated = detection.tasksCreated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Detection failed.";
      await logEvent(admin, {
        userId,
        connectionId,
        syncRunId,
        type: "detection_failed",
        message,
      });
      if (!errorMessage) errorMessage = message;
    }
  }

  // 5) Close out the run honestly.
  await admin
    .from("sync_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      total_pages: totalPages,
      pages_fetched: pagesFetched,
      rows_upserted: rowsUpserted,
      tasks_created: tasksCreated,
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
    })
    .eq("id", syncRunId);

  await logEvent(admin, {
    userId,
    connectionId,
    syncRunId,
    type: `sync_${status}`,
    message:
      status === "completed"
        ? `Sync completed: ${pagesFetched}/${totalPages} pages, ${rowsUpserted} rows, ${tasksCreated} task(s).`
        : status === "partial"
          ? `Sync partial: ${pagesFetched}/${totalPages} pages. ${errorMessage}`
          : `Sync failed: ${errorMessage}`,
    data: { status, pagesFetched, totalPages, rowsUpserted, tasksCreated, errorCode },
  });

  return {
    syncRunId,
    status,
    pagesFetched,
    totalPages,
    rowsUpserted,
    tasksCreated,
    errorCode,
    errorMessage,
  };
}
