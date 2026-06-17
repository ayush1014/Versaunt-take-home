# Mock Data Contract

This document describes the fixture files in `mock-data/` and how candidates should use them to simulate a flaky external ad platform API.

## Fixture files

| File | Description |
|------|-------------|
| `account.json` | Single mock ad account (`act_mock_1001`, platform `mock_meta`) |
| `campaigns.json` | 3 campaigns (2 active, 1 paused) |
| `ads.json` | 6 ads linked to campaigns; includes `signal_profile` hints for reviewers only |
| `metrics-daily.json` | 30 days of daily metrics per ad (150 rows total) |
| `api-responses/success-page1.json` | Paginated success response — page 1 |
| `api-responses/success-page2.json` | Paginated success response — page 2 |
| `api-responses/rate_limit.json` | Error envelope for HTTP 429 |
| `api-responses/auth_expired.json` | Error envelope for HTTP 401 |
| `api-responses/timeout.json` | Error envelope for timeout / HTTP 504 |

> **Note:** `signal_profile` on ads is for Versaunt reviewers. Candidates should not hardcode detection to these string values — detection must be derived from metrics.

## Entity shapes

### Account (`account.json`)

```json
{
  "id": "act_mock_1001",
  "name": "Acme Outdoor Co. — Mock Ad Account",
  "platform": "mock_meta",
  "currency": "USD",
  "timezone": "America/New_York",
  "status": "active"
}
```

### Campaign

```json
{
  "id": "camp_100",
  "account_id": "act_mock_1001",
  "name": "Spring Sale — Prospecting",
  "status": "active",
  "objective": "conversions"
}
```

### Ad

```json
{
  "id": "ad_a",
  "campaign_id": "camp_100",
  "name": "Hero Video — Trail Runner v1",
  "status": "active",
  "creative_type": "video"
}
```

### Daily metric row

```json
{
  "date": "2026-06-16",
  "ad_id": "ad_a",
  "campaign_id": "camp_100",
  "account_id": "act_mock_1001",
  "impressions": 44900,
  "clicks": 404,
  "spend": 107.0,
  "conversions": 9,
  "ctr": 0.009,
  "frequency": 3.5
}
```

## Date range

Metrics span **2026-05-18** through **2026-06-16** (30 days, inclusive).

## Embedded detection signals

A correct implementation should derive these from `metrics-daily.json` — not from hardcoded ad IDs in detection logic.

| Ad ID | Signal | Expected behavior |
|-------|--------|-------------------|
| `ad_a` | **Creative fatigue** | CTR drops ~25% in last 7d vs prior 7d; frequency rises from ~2.1 to ~3.5 |
| `ad_b` | **Stable control** | Should not trigger fatigue or spend-spike rules |
| `ad_c` | **Spend spike** | Spend up ~45%+ in last 7d vs prior 7d; conversions stay flat (~6/day) |
| `ad_d` | **Insufficient baseline** | Only 2 days of data (2026-06-15, 2026-06-16) — detection should skip or flag "insufficient data" |
| `ad_e` | **Missing days** | No rows for 2026-05-30 and 2026-05-31 — detection should handle gaps |
| `ad_f` | **Stable control** | Paused campaign; stable metrics |

### Suggested fatigue rule (candidates may vary)

Example: flag when **last 7d average CTR** is ≥15% lower than **prior 7d average CTR** AND **last 7d average frequency** increased by ≥0.5.

With this rule, `ad_a` should flag. `ad_b` and `ad_f` should not.

## Mock API implementation

Implement a server-side route in your app (suggested path: `GET /api/mock-platform/metrics`) that reads from these fixtures and simulates platform behavior.

### Pagination

Success responses use this envelope (see `api-responses/success-page*.json`):

```json
{
  "page": 1,
  "page_size": 100,
  "total_pages": 2,
  "total_rows": 150,
  "account_id": "act_mock_1001",
  "data": [ /* metric rows */ ]
}
```

Your sync pipeline should fetch **all pages** before marking sync complete.

Query params:

| Param | Description |
|-------|-------------|
| `page` | Page number (1-based). Default: `1` |
| `account_id` | Required. Use `act_mock_1001` |

### Failure simulation

Support a `fail` query param on your mock endpoint. Versaunt reviewers will exercise these during async review.

| `fail` value | HTTP status | Behavior | Candidate should |
|--------------|-------------|----------|------------------|
| *(none)* | 200 | Return paginated success | Complete sync when all pages succeed |
| `rate_limit` | 429 | Return `api-responses/rate_limit.json` | Treat as retryable; sync status reflects failure or partial state |
| `page2` | 200 then error | Page 1 succeeds; page 2 returns 500 or error JSON | Honest partial sync state — do not report full success |
| `auth` | 401 | Return `api-responses/auth_expired.json` | Terminal failure; clear operator message |
| `timeout` | 504 (or slow response >30s) | Return `api-responses/timeout.json` or hang | Treat as retryable |

Example URLs reviewers may hit:

```
GET /api/mock-platform/metrics?account_id=act_mock_1001&page=1
GET /api/mock-platform/metrics?account_id=act_mock_1001&page=1&fail=rate_limit
GET /api/mock-platform/metrics?account_id=act_mock_1001&page=1&fail=page2
GET /api/mock-platform/metrics?account_id=act_mock_1001&page=1&fail=auth
GET /api/mock-platform/metrics?account_id=act_mock_1001&page=1&fail=timeout
```

Document in your README how reviewers trigger each mode in your implementation.

## Idempotency hint

Daily metrics are uniquely identified by `(account_id, ad_id, date)`. Upserting on that key prevents duplicate rows when sync runs twice.

## Regenerating fixtures

Maintainers only:

```bash
node scripts/generate-metrics.mjs
```

This overwrites `metrics-daily.json` and `api-responses/success-page*.json`.
