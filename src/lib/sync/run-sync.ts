import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMetricsPage, PlatformError } from "@/lib/sync/mock-client";
import { runDetectors } from "@/lib/detection/run-detectors";
import type { MetricRow, SyncStatus } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// "skipped" is not a persisted sync_runs status. It means a concurrent sync
// already holds this connection's lock, so the attempt made no changes at all.
export type SyncResultStatus = SyncStatus | "skipped";

export type SyncResult = {
  syncRunId: string | null;
  status: SyncResultStatus;
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
  // any older than 2 minutes as failed so the UI never shows it stuck forever,
  // and so a crashed sync can't hold the per-connection lock indefinitely.
  // The cutoff uses the app-server clock against the DB-set started_at; the
  // 2-min threshold sits well above the 60s function budget, so it only ever
  // reaps genuinely dead runs as long as the two clocks are within ~minutes
  // (true on NTP-synced infra).
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

  // 1) Open a sync run. This row is also the per-connection lock: a partial
  //    unique index on sync_runs (connection_id) WHERE status = 'running'
  //    allows only one in-flight run per connection. If another sync for this
  //    connection is already running, this insert fails with a unique violation
  //    (23505) and we back off below instead of double-syncing. The lock is
  //    per-connection, so other accounts keep syncing in parallel.
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
  if (runErr) {
    // 23505 = unique_violation: a concurrent sync already holds the lock. Skip
    // cleanly — no run row, no events, no detection — so two syncs at once can
    // never double count or leave duplicate run/event rows.
    if (runErr.code === "23505") {
      return {
        syncRunId: null,
        status: "skipped",
        pagesFetched: 0,
        totalPages: null,
        rowsUpserted: 0,
        tasksCreated: 0,
        errorMessage: "A sync is already in progress for this account.",
      };
    }
    throw new Error(`Could not start sync run: ${runErr.message}`);
  }
  if (!run) throw new Error("Could not start sync run.");
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

  // 4) Run detection — only on a complete dataset we can stand behind. The mock
  //    platform paginates by date, so a partial sync is missing the most recent
  //    days; running detection on it would anchor the trend windows on stale
  //    data and raise (or miss) alerts as if nothing were missing. On a partial
  //    sync we defer detection to the next complete run and record why.
  //    A detection failure must never strand the run as "running" — catch it,
  //    record it, and still finalize the run below.
  let tasksCreated = 0;
  if (status === "completed") {
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
  } else if (status === "partial") {
    await logEvent(admin, {
      userId,
      connectionId,
      syncRunId,
      type: "detection_deferred",
      message: `Detection deferred: only ${pagesFetched}/${totalPages} pages synced. It will run on the next complete sync.`,
      data: { pagesFetched, totalPages },
    });
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
