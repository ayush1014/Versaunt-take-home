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
