# Architecture Hint (optional inspiration)

This diagram is **not prescriptive**. You choose your own schema, routes, and naming. It reflects patterns common in ad-tech operator tools — including systems like Versaunt Singularity — without requiring you to mirror any specific codebase.

## Suggested data flow

```
Operator
   │
   ▼
 Auth (Supabase)
   │
   ▼
 Connection ──► stores mock account link per user
   │
   ▼
 SyncRun ─────► triggered manually or on schedule
   │
   ▼
 Mock Platform API ──► reads mock-data fixtures
   │                    supports fail= modes
   ▼
 MetricsCurrent + MetricsHistory
   │
   ▼
 Detector(s) ──► e.g. creative fatigue rule
   │
   ▼
 Tasks + Events ──► operator queue + audit trail
```

## Table ideas (you decide names and columns)

| Concept | Purpose |
|---------|---------|
| `connections` | User's linked ad account(s) |
| `sync_runs` | Each sync attempt: status, started_at, completed_at, error |
| `metrics_history` | Daily rows: ad_id, date, impressions, clicks, spend, ctr, frequency, … |
| `metrics_current` | Optional latest snapshot per ad for fast UI |
| `tasks` | Operator actions: title, status, evidence JSON, ad_id |
| `events` | Audit log: sync_started, sync_failed, task_created, … |

## Sync status semantics

Be explicit. Operators and reviewers should never see "success" when data is partial or the second page failed.

| Status | Meaning |
|--------|---------|
| `completed` | All pages fetched and persisted |
| `partial` | Some data saved; recoverable error occurred |
| `failed` | Terminal error (e.g. auth expired) or unrecoverable failure |
| `running` | In progress |

## Detection idempotency

If the same fatigue signal exists on every sync, avoid creating duplicate tasks. Options:

- Upsert tasks by `(ad_id, rule_type, period)` 
- Only create a new task when evidence crosses a threshold **or** worsens
- Store `last_detected_at` and compare evidence hashes

## RLS pattern

Every tenant table should include `user_id` (or derive access via `connection.user_id`) and a policy like:

```sql
-- Example only — adapt to your schema
CREATE POLICY "users_own_connections"
  ON connections FOR ALL
  USING (auth.uid() = user_id);
```

Service role key: server routes and workers only. Never expose in client bundles.

## What Versaunt cares about

1. Data moves through the pipeline honestly
2. Failures are visible, not swallowed
3. Detection is derived from stored metrics, not hardcoded UI flags
4. A follow-up change (Phase 2) can be made without rewriting everything

Good luck — scope tight and make it work end-to-end.
