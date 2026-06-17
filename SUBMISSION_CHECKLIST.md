# Submission Checklist

Complete every item before emailing Versaunt that Phase 1 is done.

## Repository

- [ ] Created a **new public repository** using **Use this template** (not a fork of the template repo)
- [ ] Did **not** open PRs or push commits to the template repository
- [ ] Added GitHub collaborators: **`keylem-collier`**, **`gsteckel20`**

## Deployment

- [ ] App is deployed to **Vercel**
- [ ] **Vercel URL** is in your README
- [ ] Deploy loads and is usable **without manual database steps** (or README documents one-time setup clearly)

## Supabase

- [ ] Created your own free Supabase project
- [ ] Copied [`.env.example`](.env.example) → `.env.local` (and matching vars on Vercel)
- [ ] Invited **`kane@versaunt.com`** — **read-only** (Project Settings → Team → Invite)
- [ ] Invited **`greg@versaunt.com`** — **read-only**
- [ ] RLS enabled on all tenant-scoped tables

## README (in your repo)

- [ ] Local setup instructions
- [ ] Environment variables documented
- [ ] How to connect the mock account and run sync
- [ ] How to **run sync twice** (for idempotency verification)
- [ ] How to trigger each failure mode: `rate_limit`, `page2`, `auth`, `timeout`
- [ ] Architecture overview and tradeoffs
- [ ] Known gaps listed honestly

## Functional verification (self-check)

- [ ] Can sign up / sign in
- [ ] Can connect or select mock account `act_mock_1001`
- [ ] Manual sync ingests metrics from mock API
- [ ] At least one automated task/flag appears (e.g. creative fatigue on `ad_a`)
- [ ] Task shows evidence or rationale (not just a generic message)
- [ ] Re-running sync does not corrupt metrics history
- [ ] Second test user **cannot** see first user's data (RLS)

## Email us

**To:** kane@versaunt.com, greg@versaunt.com

**Subject:** `Founding Engineer Challenge — Phase 1 Complete — [Your Name]`

Include:

- Your name
- GitHub repo URL
- Vercel URL
- Any demo credentials
- Total time spent (honor system)
- One paragraph: what you would do with 6 more hours
