-- Ad Performance Monitor — initial schema
-- Multi-tenant by user_id with RLS on every tenant table.
-- Writes are performed by the sync worker using the service role (bypasses RLS);
-- operators read their own rows (and update task status) under RLS.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- connections — a user's link to a mock ad account
-- ---------------------------------------------------------------------------
create table public.connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  account_id    text not null,                       -- e.g. act_mock_1001
  account_name  text,
  platform      text not null default 'mock_meta',
  currency      text,
  timezone      text,
  status        text not null default 'active',      -- active | auth_expired | disconnected
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, account_id)                       -- one link per account per user
);

create trigger connections_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campaigns — entity metadata seeded from fixtures (for UI names)
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id                   uuid primary key default gen_random_uuid(),
  connection_id        uuid not null references public.connections (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  platform_campaign_id text not null,                -- e.g. camp_100
  name                 text,
  status               text,
  objective            text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (connection_id, platform_campaign_id)
);

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ads — entity metadata seeded from fixtures (for UI names / task copy)
-- ---------------------------------------------------------------------------
create table public.ads (
  id                   uuid primary key default gen_random_uuid(),
  connection_id        uuid not null references public.connections (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  platform_ad_id       text not null,                -- e.g. ad_a
  platform_campaign_id text,
  name                 text,
  status               text,
  creative_type        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (connection_id, platform_ad_id)
);

create trigger ads_updated_at
  before update on public.ads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sync_runs — each sync attempt and its honest status
-- ---------------------------------------------------------------------------
create table public.sync_runs (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid not null references public.connections (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  status         text not null default 'running',    -- running | completed | partial | failed
  trigger        text not null default 'manual',      -- manual | cron
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  total_pages    int,
  pages_fetched  int not null default 0,
  rows_upserted  int not null default 0,
  tasks_created  int not null default 0,
  error_code     text,
  error_message  text,
  created_at     timestamptz not null default now()
);

create index sync_runs_connection_idx on public.sync_runs (connection_id, started_at desc);
create index sync_runs_user_idx on public.sync_runs (user_id);

-- ---------------------------------------------------------------------------
-- metrics_history — daily metric rows; the trend data detection reads
-- Idempotency key: (connection_id, ad_id, date)
-- ---------------------------------------------------------------------------
create table public.metrics_history (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid not null references public.connections (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  account_id     text not null,
  campaign_id    text not null,
  ad_id          text not null,
  date           date not null,
  impressions    bigint not null default 0,
  clicks         bigint not null default 0,
  spend          numeric(14, 2) not null default 0,
  conversions    bigint not null default 0,
  ctr            numeric(8, 5),
  frequency      numeric(8, 3),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (connection_id, ad_id, date)
);

create index metrics_history_user_idx on public.metrics_history (user_id);
create index metrics_history_lookup_idx on public.metrics_history (connection_id, ad_id, date);

create trigger metrics_history_updated_at
  before update on public.metrics_history
  for each row execute function public.set_updated_at();

-- Latest day per ad — derived, so it can never drift from history.
-- security_invoker makes the view respect the querying user's RLS on metrics_history.
create view public.metrics_current
with (security_invoker = on)
as
select distinct on (connection_id, ad_id)
  connection_id, user_id, account_id, campaign_id, ad_id, date,
  impressions, clicks, spend, conversions, ctr, frequency
from public.metrics_history
order by connection_id, ad_id, date desc;

-- ---------------------------------------------------------------------------
-- tasks — operator action items produced by detection
-- Idempotency key: (connection_id, ad_id, rule_type, period)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  connection_id     uuid not null references public.connections (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  ad_id             text not null,
  campaign_id       text,
  rule_type         text not null,                   -- creative_fatigue | spend_spike
  period            text not null,                   -- analysis date window, for idempotency
  title             text not null,
  description       text,
  severity          text not null default 'warning', -- info | warning | critical
  status            text not null default 'open',    -- open | resolved | dismissed
  evidence          jsonb not null default '{}'::jsonb,
  detected_at       timestamptz not null default now(),
  last_detected_at  timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (connection_id, ad_id, rule_type, period)
);

create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_connection_idx on public.tasks (connection_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- events — append-only audit log ("why did this happen?")
-- ---------------------------------------------------------------------------
create table public.events (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  connection_id  uuid references public.connections (id) on delete cascade,
  sync_run_id    uuid references public.sync_runs (id) on delete cascade,
  task_id        uuid references public.tasks (id) on delete set null,
  type           text not null,                       -- sync_started | sync_page_fetched | sync_retry | sync_completed | sync_partial | sync_failed | task_created | task_updated | detection_skipped | ...
  message        text,
  data           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index events_user_created_idx on public.events (user_id, created_at desc);
create index events_sync_run_idx on public.events (sync_run_id);
create index events_task_idx on public.events (task_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — enable on every tenant table
-- ---------------------------------------------------------------------------
alter table public.connections     enable row level security;
alter table public.campaigns       enable row level security;
alter table public.ads             enable row level security;
alter table public.sync_runs       enable row level security;
alter table public.metrics_history enable row level security;
alter table public.tasks           enable row level security;
alter table public.events          enable row level security;

-- connections: owner has full control (operator connects/disconnects accounts).
create policy "connections_select_own" on public.connections
  for select using ((select auth.uid()) = user_id);
create policy "connections_insert_own" on public.connections
  for insert with check ((select auth.uid()) = user_id);
create policy "connections_update_own" on public.connections
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "connections_delete_own" on public.connections
  for delete using ((select auth.uid()) = user_id);

-- campaigns / ads: read-only for the operator (seeded server-side via service role).
create policy "campaigns_select_own" on public.campaigns
  for select using ((select auth.uid()) = user_id);
create policy "ads_select_own" on public.ads
  for select using ((select auth.uid()) = user_id);

-- sync_runs: read-only for the operator (written by the sync worker).
create policy "sync_runs_select_own" on public.sync_runs
  for select using ((select auth.uid()) = user_id);

-- metrics_history: read-only for the operator.
create policy "metrics_history_select_own" on public.metrics_history
  for select using ((select auth.uid()) = user_id);

-- tasks: operator can read and update status (resolve / dismiss); creation is server-side.
create policy "tasks_select_own" on public.tasks
  for select using ((select auth.uid()) = user_id);
create policy "tasks_update_own" on public.tasks
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- events: read-only audit trail for the operator.
create policy "events_select_own" on public.events
  for select using ((select auth.uid()) = user_id);
