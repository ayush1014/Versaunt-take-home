# Phase 2

Good work on Phase 1. The sync pipeline, schema, and RLS are in solid shape, and the UI looks great.

Here's a follow-up based on what we ran into while poking at your sync. Work in this repo and push when you're done. Should be about 90 minutes.

Two issues, both in the sync path.

**1. Partial syncs claim more than they got.**

When page 2 fails (`fail=page2`) the sync correctly comes back partial, which is good. But it still runs detection on the half it got and raises alerts off that, like nothing's missing. And if you run the same sync twice on data that hasn't changed, the audit log still says evidence was "refreshed" even though nothing did.

We want partial syncs to be honest. Only run detection on data you can stand behind, and don't log audit events for work that didn't happen.

**2. Two syncs at once aren't safe.**

If an operator double clicks "Sync now," or a manual sync overlaps the cron, two syncs hit the same account at once. Right now both go through, which can double up runs, events, and detection.

Make concurrent syncs safe so they don't double count or leave duplicate run and event rows.

One thing to keep in mind while you design this: a nightly cron syncs every connected account, and an operator can hit "Sync now" on their own account at any time, including while that cron is running. A manual sync of one account shouldn't have to wait behind the syncs of other accounts.

When you're done we'll check it by failing page 2, running a sync twice, and firing two syncs at the same instant. AI is fine like before, but we'll go through your changes together on the call, so be ready to explain how it works.

Thanks,
Kane & Greg

---

# Solution — what changed and how it works

Both fixes live in the sync path. Files touched:

| File | Role |
| --- | --- |
| `supabase/migrations/0002_concurrent_sync_safety.sql` *(new)* | Per-connection sync lock + retires old stuck runs |
| `src/lib/sync/run-sync.ts` | Acquires/handles the lock; runs detection only on complete data |
| `src/lib/detection/run-detectors.ts` | Change-aware task audit (no false "refreshed") |
| `src/lib/detection/stable-stringify.ts` *(+ test)* | Order-independent evidence comparison |
| `src/components/dashboard/sync-panel.tsx` | Surfaces `skipped` / `partial` to the operator |

## 1. Partial syncs are honest now

**What was wrong**
- Detection ran on the half-fetched data and raised alerts as if nothing were missing.
- Re-running an unchanged sync logged an "evidence refreshed" audit event even though nothing had changed.

**Why it mattered (the key insight)**
The mock platform paginates **by date** — page 1 is the older days, page 2 is the most recent ~2 weeks. Detection anchors its "last 7 days vs prior 7 days" comparison on the most recent date it has. So when page 2 fails, a partial sync is missing *the present*, and detection would silently anchor on stale data — firing or missing alerts off an incomplete picture. A partial sync therefore can't be trusted at all, which is why we skip detection rather than filter it.

**What changed**
- **Detection runs only on a `completed` sync.** On a `partial` sync we skip detection and write a single `detection_deferred` audit event explaining why; the next complete sync picks it up. (`run-sync.ts`)
- **Task audit is change-aware.** Before logging a `task_updated` ("refreshed") event, we compare the new finding (severity + evidence) against what's already stored. If it's identical we bump `last_detected_at` — we *did* re-confirm the condition is live — but log **no** event. Brand-new or genuinely changed findings still log `task_created` / `task_updated`. (`run-detectors.ts`)
- Evidence is compared with a small **order-independent JSON** helper, because Postgres `jsonb` doesn't preserve object key order and a naive compare would report false changes. (`stable-stringify.ts`)

**Result:** partial syncs never raise alerts off incomplete data, and re-running an unchanged sync adds zero noise to the audit log while keeping `last_detected_at` honest.

## 2. Concurrent syncs are safe now

**What was wrong**
Two syncs hitting the same account at once (a double-click, or a manual sync overlapping the nightly cron) both went through — duplicating runs, events, and detection.

**What changed**
- **The in-flight `running` sync_run row is the lock.** A partial unique index allows at most one `running` row per connection (`0002_concurrent_sync_safety.sql`). A second simultaneous sync's `INSERT` fails with a unique violation (`23505`); `run-sync.ts` catches it and returns a clean **`skipped`** result instead of double-syncing — no extra run, events, or detection.
- **The lock is per-connection**, so it never serializes different accounts: a manual "Sync now" runs immediately even while the cron is working through other accounts — a one-account sync never waits behind the others.
- A crashed sync that never finalized is freed by the stale-run reaper (marks `running` rows older than 2 min as `failed`), which clears the lock. The migration also retires any pre-existing stuck `running` rows before building the index, so it applies cleanly to a database that accumulated them.

**Result:** firing N syncs at the same instant produces exactly one real run; the rest are skipped. No duplicate run/event rows, no double-counted detection.

## How to verify (the three checks)

1. **Fail page 2** — `POST /api/sync?fail=page2` → run comes back `partial`, a `detection_deferred` event is logged, and no task/alert events are written off the incomplete data.
2. **Run a normal sync twice** — the second run logs no `task_created` / `task_updated` events (nothing changed); `last_detected_at` still advances.
3. **Fire two (or more) syncs at the same instant** — exactly one completes, the rest return `skipped`; only one new `sync_run` row exists.

Thanks,
Ayush Kanaujia

