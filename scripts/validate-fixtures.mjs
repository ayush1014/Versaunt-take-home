#!/usr/bin/env node
/**
 * Dry-run validation: verifies mock fixtures support detection rules
 * without candidates inventing extra data.
 *
 * Run: node scripts/validate-fixtures.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockDir = join(__dirname, "..", "mock-data");

const metrics = JSON.parse(readFileSync(join(mockDir, "metrics-daily.json"), "utf8"));
const ads = JSON.parse(readFileSync(join(mockDir, "ads.json"), "utf8"));
const page1 = JSON.parse(readFileSync(join(mockDir, "api-responses/success-page1.json"), "utf8"));
const page2 = JSON.parse(readFileSync(join(mockDir, "api-responses/success-page2.json"), "utf8"));

const errors = [];
const warnings = [];

function avg(arr, key) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, r) => s + r[key], 0) / arr.length;
}

function lastNDays(adId, n, endDate = "2026-06-16") {
  const adRows = metrics.filter((r) => r.ad_id === adId).sort((a, b) => a.date.localeCompare(b.date));
  const endIdx = adRows.findIndex((r) => r.date === endDate);
  if (endIdx < 0) return [];
  return adRows.slice(Math.max(0, endIdx - n + 1), endIdx + 1);
}

// Pagination
const combined = [...page1.data, ...page2.data];
if (combined.length !== metrics.length) {
  errors.push(`Pagination mismatch: pages=${combined.length} metrics=${metrics.length}`);
}
if (page1.total_pages !== 2 || page2.total_pages !== 2) {
  errors.push("total_pages should be 2");
}

// ad_a fatigue
const adA_prior = lastNDays("ad_a", 7, "2026-06-09");
const adA_last = lastNDays("ad_a", 7, "2026-06-16");
const ctrDrop = (avg(adA_prior, "ctr") - avg(adA_last, "ctr")) / avg(adA_prior, "ctr");
const freqRise = avg(adA_last, "frequency") - avg(adA_prior, "frequency");

if (ctrDrop < 0.2) errors.push(`ad_a CTR drop ${(ctrDrop * 100).toFixed(1)}% — expected >= 20%`);
if (freqRise < 0.4) errors.push(`ad_a frequency rise ${freqRise.toFixed(2)} — expected >= 0.4`);

// ad_b stable
const adB_prior = lastNDays("ad_b", 7, "2026-06-09");
const adB_last = lastNDays("ad_b", 7, "2026-06-16");
const adBCtrDrop = (avg(adB_prior, "ctr") - avg(adB_last, "ctr")) / avg(adB_prior, "ctr");
if (adBCtrDrop > 0.15) warnings.push(`ad_b CTR drop ${(adBCtrDrop * 100).toFixed(1)}% — may false-positive fatigue rule`);

// ad_c spend spike
const adC_prior = lastNDays("ad_c", 7, "2026-06-09");
const adC_last = lastNDays("ad_c", 7, "2026-06-16");
const spendRatio = avg(adC_last, "spend") / avg(adC_prior, "spend");
const convFlat = Math.abs(avg(adC_last, "conversions") - avg(adC_prior, "conversions")) < 2;
if (spendRatio < 1.35) errors.push(`ad_c spend ratio ${spendRatio.toFixed(2)} — expected >= 1.35`);
if (!convFlat) warnings.push("ad_c conversions not flat — spend-spike rule may be noisy");

// ad_d insufficient baseline
const adDRows = metrics.filter((r) => r.ad_id === "ad_d");
if (adDRows.length !== 2) errors.push(`ad_d should have 2 days, has ${adDRows.length}`);

// ad_e missing days
const adEDates = new Set(metrics.filter((r) => r.ad_id === "ad_e").map((r) => r.date));
if (adEDates.has("2026-05-30") || adEDates.has("2026-05-31")) {
  errors.push("ad_e should be missing 2026-05-30 and 2026-05-31");
}

// API error envelopes
for (const file of ["rate_limit.json", "auth_expired.json", "timeout.json"]) {
  const body = JSON.parse(readFileSync(join(mockDir, "api-responses", file), "utf8"));
  if (!body.error?.code) errors.push(`${file} missing error.code`);
}

// Row count sanity
const expectedAds = ads.length;
const dates = 30;
const adD_missing = 28; // ad_d only 2 days
const adE_missing = 2; // 2 gap days
const expectedRows = expectedAds * dates - adD_missing - adE_missing;
if (metrics.length !== expectedRows) {
  warnings.push(`Row count ${metrics.length} vs expected ~${expectedRows}`);
}

console.log("=== Fixture validation ===\n");
console.log("ad_a: CTR drop", `${(ctrDrop * 100).toFixed(1)}%`, "| freq rise", freqRise.toFixed(2));
console.log("ad_c: spend ratio", spendRatio.toFixed(2));
console.log("ad_d: days", adDRows.length);
console.log("Pagination rows:", combined.length, "/", metrics.length);
console.log("");

if (warnings.length) {
  console.log("Warnings:");
  warnings.forEach((w) => console.log("  ⚠", w));
  console.log("");
}

if (errors.length) {
  console.log("Errors:");
  errors.forEach((e) => console.log("  ✗", e));
  process.exit(1);
}

console.log("✓ All fixture checks passed. Ready for candidate use.");
