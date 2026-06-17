# Publishing the template (founders only)

This file is safe to commit. The reviewer pack in `internal/` is **gitignored** — keep it local or copy to Notion.

## 1. Create and push the public repo

```bash
cd /Users/kane/Documents/ad-performance-monitor-challenge
git init
git add .
git commit -m "Ad Performance Monitor challenge template v1.0"
gh repo create ad-performance-monitor-challenge --public --source=. --remote=origin --push
```

Or create the repo on GitHub first, then:

```bash
git remote add origin https://github.com/keylem-collier/ad-performance-monitor-challenge.git
git push -u origin main
git tag v1.0
git push origin v1.0
```

## 2. Enable template repository

GitHub → **Settings** → **General** → check **Template repository**

Candidates will see the green **Use this template** button.

## 3. Verify

- [ ] README renders correctly
- [ ] `mock-data/` fixtures present
- [ ] `internal/` is NOT in the repo (`git ls-files internal` should be empty)
- [ ] Tag `v1.0` exists

## 4. Share with candidates

Send:

- Template URL: `https://github.com/keylem-collier/ad-performance-monitor-challenge`
- Instruction to use **Use this template** (not fork)
- Email to confirm when Phase 1 clock starts

## 5. Reviewer materials

Copy `internal/REVIEWER_PACK.md` to your private Notion/doc before deleting local copy if desired.
