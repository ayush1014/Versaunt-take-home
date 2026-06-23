-- Phase 2 — make concurrent syncs safe.
--
-- At most one in-flight ("running") sync per connection. The running sync_run
-- row IS the lock: when a second sync for the same connection starts while one
-- is already in flight, its INSERT hits this unique index and fails with a
-- unique violation (SQLSTATE 23505). run-sync.ts catches that and backs off
-- ("skipped") instead of double-syncing — so two syncs at once can't double
-- count or leave duplicate run/event rows.
--
-- The index is per-connection, so different accounts still sync in parallel:
-- a manual "Sync now" never waits behind another account's sync (e.g. the
-- nightly cron working through other connections).
--
-- A crashed sync that never finalized is freed by the stale-run reaper in
-- run-sync.ts (it marks 'running' rows older than 2 min as 'failed', which is
-- safely above the 60s function time budget), and that clears this index.

-- First, retire any pre-existing stragglers. Before this migration there was no
-- reaper, so a crashed/timed-out sync left its row stuck at status='running'
-- forever. A partial unique index is BUILT against existing data, so it would
-- abort if any connection already had 2+ such rows. Any 'running' row that
-- predates this migration cannot belong to a live process, so it is safe to
-- retire them all here — this also guarantees the index builds cleanly.
update public.sync_runs
   set status = 'failed',
       error_code = 'STALE_RUN',
       error_message = 'Retired during concurrent-sync-safety migration.',
       completed_at = now()
 where status = 'running';

-- Now the per-connection lock.
create unique index if not exists sync_runs_one_running_per_connection
  on public.sync_runs (connection_id)
  where status = 'running';
