#!/usr/bin/env node
/**
 * Generates mock-data/metrics-daily.json and paginated api-responses.
 * Run once: node scripts/generate-metrics.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mockDir = join(root, "mock-data");
const apiDir = join(mockDir, "api-responses");

const START = new Date("2026-05-18T00:00:00Z");
const DAYS = 30;

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** @type {Record<string, (dayIndex: number) => { impressions: number; clicks: number; spend: number; conversions: number; frequency: number } | null>} */
const profiles = {
  ad_a: (dayIndex) => {
    const fatiguing = dayIndex >= 23;
    const impressions = fatiguing ? 42000 + dayIndex * 100 : 38000 + dayIndex * 80;
    const ctr = fatiguing ? 0.009 : 0.012;
    const clicks = Math.round(impressions * ctr);
    const spend = fatiguing ? 95 + (dayIndex - 23) * 4 : 72 + dayIndex * 1.5;
    const conversions = fatiguing ? 8 + (dayIndex % 3) : 14 + (dayIndex % 4);
    const frequency = fatiguing ? 3.2 + (dayIndex - 23) * 0.1 : 2.0 + dayIndex * 0.005;
    return { impressions, clicks, spend: +spend.toFixed(2), conversions, frequency: +frequency.toFixed(2) };
  },
  ad_b: (dayIndex) => {
    const impressions = 22000 + dayIndex * 50;
    const ctr = 0.011 + (dayIndex % 5) * 0.0002;
    const clicks = Math.round(impressions * ctr);
    const spend = 45 + dayIndex * 0.8;
    const conversions = 10 + (dayIndex % 3);
    const frequency = 1.8 + (dayIndex % 7) * 0.05;
    return { impressions, clicks, spend: +spend.toFixed(2), conversions, frequency: +frequency.toFixed(2) };
  },
  ad_c: (dayIndex) => {
    const recent = dayIndex >= 23;
    const spend = recent ? 140 + (dayIndex - 23) * 8 : 75 + dayIndex * 1.2;
    const impressions = recent ? 55000 + dayIndex * 200 : 30000 + dayIndex * 100;
    const ctr = 0.008;
    const clicks = Math.round(impressions * ctr);
    const conversions = 6 + (dayIndex % 2);
    const frequency = recent ? 2.5 : 2.0;
    return { impressions, clicks, spend: +spend.toFixed(2), conversions, frequency };
  },
  ad_d: (dayIndex) => {
    if (dayIndex < 28) return null;
    return { impressions: 8000, clicks: 96, spend: 22, conversions: 2, frequency: 1.1 };
  },
  ad_e: (dayIndex) => {
    if (dayIndex === 12 || dayIndex === 13) return null;
    const impressions = 15000 + dayIndex * 40;
    const ctr = 0.007;
    const clicks = Math.round(impressions * ctr);
    const spend = 35 + dayIndex * 0.5;
    const conversions = 4 + (dayIndex % 2);
    const frequency = 1.5;
    return { impressions, clicks, spend: +spend.toFixed(2), conversions, frequency };
  },
  ad_f: (dayIndex) => {
    const impressions = 12000 + dayIndex * 30;
    const ctr = 0.006;
    const clicks = Math.round(impressions * ctr);
    const spend = 28 + dayIndex * 0.4;
    const conversions = 3;
    const frequency = 1.3;
    return { impressions, clicks, spend: +spend.toFixed(2), conversions, frequency };
  },
};

const adIds = ["ad_a", "ad_b", "ad_c", "ad_d", "ad_e", "ad_f"];
const campaignByAd = {
  ad_a: "camp_100",
  ad_b: "camp_100",
  ad_c: "camp_200",
  ad_d: "camp_200",
  ad_e: "camp_300",
  ad_f: "camp_300",
};

const rows = [];

for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
  const date = dateStr(addDays(START, dayIndex));
  for (const adId of adIds) {
    const metrics = profiles[adId](dayIndex);
    if (!metrics) continue;
    const ctr = metrics.clicks / metrics.impressions;
    rows.push({
      date,
      ad_id: adId,
      campaign_id: campaignByAd[adId],
      account_id: "act_mock_1001",
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      spend: metrics.spend,
      conversions: metrics.conversions,
      ctr: +ctr.toFixed(6),
      frequency: metrics.frequency,
    });
  }
}

rows.sort((a, b) => a.date.localeCompare(b.date) || a.ad_id.localeCompare(b.ad_id));

writeFileSync(join(mockDir, "metrics-daily.json"), `${JSON.stringify(rows, null, 2)}\n`);

const mid = Math.ceil(rows.length / 2);
const page1 = rows.slice(0, mid);
const page2 = rows.slice(mid);

const envelope = (page, data) => ({
  page,
  page_size: 100,
  total_pages: 2,
  total_rows: rows.length,
  account_id: "act_mock_1001",
  data,
});

mkdirSync(apiDir, { recursive: true });
writeFileSync(join(apiDir, "success-page1.json"), `${JSON.stringify(envelope(1, page1), null, 2)}\n`);
writeFileSync(join(apiDir, "success-page2.json"), `${JSON.stringify(envelope(2, page2), null, 2)}\n`);

writeFileSync(
  join(apiDir, "rate_limit.json"),
  `${JSON.stringify(
    {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Retry after 60 seconds.",
        retry_after_seconds: 60,
      },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(apiDir, "auth_expired.json"),
  `${JSON.stringify(
    {
      error: {
        code: "AUTH_TOKEN_EXPIRED",
        message: "Access token has expired. Reconnect the ad account.",
      },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(apiDir, "timeout.json"),
  `${JSON.stringify(
    {
      error: {
        code: "GATEWAY_TIMEOUT",
        message: "Upstream platform did not respond within 30 seconds.",
        retryable: true,
      },
    },
    null,
    2,
  )}\n`,
);

const adA = rows.filter((r) => r.ad_id === "ad_a");
const early = adA.filter((r) => r.date >= "2026-06-03" && r.date <= "2026-06-09");
const late = adA.filter((r) => r.date >= "2026-06-10" && r.date <= "2026-06-16");
const avgCtr = (arr) => arr.reduce((s, r) => s + r.ctr, 0) / arr.length;
const avgFreq = (arr) => arr.reduce((s, r) => s + r.frequency, 0) / arr.length;

console.log("Generated", rows.length, "metric rows");
console.log("ad_a prior 7d avg CTR:", avgCtr(early).toFixed(4), "freq:", avgFreq(early).toFixed(2));
console.log("ad_a last 7d avg CTR:", avgCtr(late).toFixed(4), "freq:", avgFreq(late).toFixed(2));
console.log("ad_a CTR drop %:", `${(((avgCtr(early) - avgCtr(late)) / avgCtr(early)) * 100).toFixed(1)}%`);
