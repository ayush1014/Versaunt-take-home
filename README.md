# Ad Performance Monitor — Founding Engineer Challenge

**Versaunt** builds AI-powered advertising tools for SMB advertisers. You do **not** have access to our production codebase. This exercise mirrors the kind of work our founding engineers do: connected ad accounts, flaky platform sync, performance drift, and operator-facing actions.

## Important: use this template correctly

1. Click **Use this template** (green button above) → **Create a new repository**
2. Make your repository **public**
3. Do **not** open pull requests to this template repository
4. Do **not** push code to this template repository
5. Build your entire solution in **your** new repository

## The ask

> SMB advertisers connect ad accounts. Performance drifts over weeks; creative fatigues; platform sync fails intermittently. Build a small **Ad Performance Monitor** that lets an operator connect an account, ingest performance data, automatically flag at least one meaningful problem, and see recommended next actions. Ship something we can use on Vercel without a walkthrough.

Product details are intentionally open. Scope the MVP yourself. A tight, working pipeline beats a broad, broken dashboard.

## Stack (required)

| Layer | Requirement |
|-------|-------------|
| Framework | **Next.js** (App Router) + **TypeScript** |
| Database / Auth | **Supabase** (Postgres + Auth + **RLS on every tenant table**) |
| Hosting | **Vercel** |
| External APIs | **Mock only** — use fixtures in [`mock-data/`](mock-data/) (see [`MOCK_DATA.md`](MOCK_DATA.md)) |

**AI tools are allowed.** Cursor, Claude, Copilot, etc. are fine. You must understand, defend, and extend everything you submit. We will stress-test your work and ask follow-up questions in a live review.

## Requirements

You must implement **all** of the following. How you implement them is your choice.

1. **Auth + RLS** — Multi-tenant. One user cannot read another user's connections, metrics, or tasks.
2. **Persisted sync pipeline** — Server-side worker (API route, cron, background job). Not a client-only fetch into React state.
3. **Flaky mock external API** — Simulate a platform metrics API using provided fixtures. Support failure modes in [`MOCK_DATA.md`](MOCK_DATA.md) (`rate_limit`, `page2`, `auth`, `timeout`).
4. **Current + historical metrics** — Store data suitable for trend detection (e.g. current snapshot + daily history).
5. **Automated detection** — At least one real rule. Recommended: **creative fatigue** (e.g. CTR decline over 7 days with rising frequency). Store **rationale / evidence** durably — not only in UI state.
6. **Task / action queue** — Operator-visible items tied to detection evidence (e.g. "Refresh creative for ad X — CTR down 25%, frequency up").
7. **Audit trail** — We can answer "why was this task created?" from stored events or logs.
8. **Idempotent sync** — Re-running sync does not corrupt data or create incorrect duplicates.

## UI (functional, not graded on polish)

Minimum operator views:

- Sign in / sign up
- Connect or select the mock ad account
- Trigger sync manually + show last sync status (success / partial / failed)
- Metrics summary (table or cards)
- Flagged issues / tasks list

We care that it works. Visual design is a tiebreaker, not a requirement.

## Mock data

Fixture files live in [`mock-data/`](mock-data/). Read [`MOCK_DATA.md`](MOCK_DATA.md) for:

- Entity shapes (account, campaigns, ads, daily metrics)
- Pagination contract (2 pages, 150 rows)
- Embedded detection signals (fatigue, spend spike, edge cases)
- Failure simulation query params

Copy or import these fixtures into your app. Do not call real Meta, Google, or TikTok APIs.

## Time and phases

| Phase | Duration | What happens |
|-------|----------|--------------|
| **Phase 1** | **6 hours** from our "go" email | Build and deploy |
| **Async review** | — | We test your Vercel deploy without you |
| **Phase 2** | **Within 24 hours** of our feedback | One personalized follow-up (bug fix or small feature) |
| **Live review** | 30–45 min | Architecture walkthrough + depth questions |

**Clock starts** when you email **kane@versaunt.com** and **greg@versaunt.com** confirming you are starting Phase 1.

## Deliverables

Before emailing "done", complete [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md).

### Required

- [ ] **Public GitHub repo** created from this template (not a fork with PRs back here)
- [ ] **Live Vercel URL** in your README
- [ ] **README** in your repo with:
  - Local setup and environment variables
  - How to seed data and run sync
  - How to trigger each `fail=` mode (see MOCK_DATA.md)
  - Architecture overview and tradeoffs
  - Known gaps and what you would do next
- [ ] **GitHub collaborators** added: `keylem-collier`, `gsteckel20`
- [ ] **Supabase project** with **read-only** invites: `kane@versaunt.com`, `greg@versaunt.com`

### Optional

- Demo account credentials in README
- Tests for detection or sync logic
- Architecture diagram

## Out of scope

- Real Meta / Google / TikTok API integration
- Billing, email notifications, webhooks
- Multi-platform support (unless you choose it voluntarily within 6 hours)
- Production-grade design system

## Getting started

1. **Use this template** → create your **public** repo (see above — do not fork or PR back here)
2. **Add Next.js** in that repo alongside the template files:
   - Clone your new repo locally
   - Run `npx create-next-app@latest .` in the repo root (TypeScript, App Router, ESLint — your choice on Tailwind)
   - When prompted about existing files, **keep** `mock-data/`, `MOCK_DATA.md`, and other template docs — do not delete them
   - Copy [`.env.example`](.env.example) to `.env.local` and fill in Supabase keys
3. Create a free [Supabase](https://supabase.com) project
4. Read [`MOCK_DATA.md`](MOCK_DATA.md) and [`docs/ARCHITECTURE_HINT.md`](docs/ARCHITECTURE_HINT.md)
5. Implement auth + schema + mock sync + detection + minimal UI
6. Deploy to Vercel (add the same env vars in the Vercel project settings)
7. Complete [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) and email **kane@versaunt.com** and **greg@versaunt.com**

Grading focuses on **metrics sync, detection, and tasks**. You may seed campaigns/ads from fixtures, but you are not required to build full entity management beyond what your pipeline needs.

## Environment variables

See [`.env.example`](.env.example). At minimum:

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** (sync routes, workers) |

## Supabase team invites (read-only)

Before submitting, invite both founders with **read-only** access:

1. Supabase Dashboard → your project → **Project Settings** → **Team**
2. **Invite** → `kane@versaunt.com` → role **Read-only**
3. **Invite** → `greg@versaunt.com` → role **Read-only**

## Contact

| When | Email |
|------|--------|
| Starting Phase 1 (clock starts) | **kane@versaunt.com**, **greg@versaunt.com** |
| Phase 1 complete | Same — use subject line in [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) |
| Logistics only | Same |

We will not answer implementation how-to questions — design decisions are part of the exercise.

## License

Mock data and challenge materials: MIT (see [LICENSE](LICENSE)). Your application code: your license.

---

**Version:** v1.1
