import { describe, it, expect } from "vitest";
import metricsDaily from "../../../mock-data/metrics-daily.json";
import { RULES, type Detection } from "./rules";
import {
  aggregate,
  computeWindows,
  inRange,
  type MetricSample,
} from "./windows";

// Mirrors the per-ad guard in run-detectors.ts so the test exercises the same
// decision the real engine makes — but against the raw fixtures, with no DB.
const MIN_WINDOW_DAYS = 3;

type AdOutcome =
  | { kind: "skipped"; lastDays: number; priorDays: number }
  | { kind: "evaluated"; detections: Detection[] };

function evaluateFixtures(): Map<string, AdOutcome> {
  const rows = metricsDaily as MetricSample[] &
    { ad_id: string; date: string }[];

  const maxDate = rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date);
  const windows = computeWindows(maxDate);

  const byAd = new Map<string, MetricSample[]>();
  for (const r of rows) {
    const sample: MetricSample = {
      date: r.date,
      impressions: Number(r.impressions),
      clicks: Number(r.clicks),
      spend: Number(r.spend),
      conversions: Number(r.conversions),
      ctr: Number(r.ctr),
      frequency: Number(r.frequency),
    };
    const list = byAd.get((r as { ad_id: string }).ad_id);
    if (list) list.push(sample);
    else byAd.set((r as { ad_id: string }).ad_id, [sample]);
  }

  const outcomes = new Map<string, AdOutcome>();
  for (const [adId, samples] of byAd) {
    const last = aggregate(
      samples.filter((s) => inRange(s.date, windows.lastStart, windows.lastEnd)),
    );
    const prior = aggregate(
      samples.filter((s) =>
        inRange(s.date, windows.priorStart, windows.priorEnd),
      ),
    );

    if (last.days < MIN_WINDOW_DAYS || prior.days < MIN_WINDOW_DAYS) {
      outcomes.set(adId, {
        kind: "skipped",
        lastDays: last.days,
        priorDays: prior.days,
      });
      continue;
    }

    const detections: Detection[] = [];
    for (const rule of RULES) {
      const d = rule.evaluate({
        adId,
        adName: adId,
        campaignId: null,
        last,
        prior,
        windows,
      });
      if (d) detections.push(d);
    }
    outcomes.set(adId, { kind: "evaluated", detections });
  }
  return outcomes;
}

const outcomes = evaluateFixtures();

function rulesFor(adId: string): string[] {
  const o = outcomes.get(adId);
  return o?.kind === "evaluated" ? o.detections.map((d) => d.ruleType) : [];
}

describe("detection rules against fixtures", () => {
  it("flags creative fatigue on ad_a (and not spend spike)", () => {
    expect(rulesFor("ad_a")).toContain("creative_fatigue");
    expect(rulesFor("ad_a")).not.toContain("spend_spike");
  });

  it("rates ad_a fatigue as critical (~25% CTR drop)", () => {
    const o = outcomes.get("ad_a");
    const fatigue =
      o?.kind === "evaluated"
        ? o.detections.find((d) => d.ruleType === "creative_fatigue")
        : undefined;
    expect(fatigue?.severity).toBe("critical");
  });

  it("flags spend spike on ad_c (and not fatigue)", () => {
    expect(rulesFor("ad_c")).toContain("spend_spike");
    expect(rulesFor("ad_c")).not.toContain("creative_fatigue");
  });

  it("does NOT flag the stable controls ad_b and ad_f", () => {
    expect(rulesFor("ad_b")).toHaveLength(0);
    expect(rulesFor("ad_f")).toHaveLength(0);
  });

  it("skips ad_d for insufficient baseline (only 2 days)", () => {
    expect(outcomes.get("ad_d")?.kind).toBe("skipped");
  });

  it("handles ad_e's missing days without crashing or false-flagging", () => {
    const o = outcomes.get("ad_e");
    // ad_e is a stable control with gaps — it should evaluate cleanly and
    // not produce a false positive.
    expect(o?.kind).toBe("evaluated");
    if (o?.kind === "evaluated") expect(o.detections).toHaveLength(0);
  });

  it("stores durable evidence with the analysis window", () => {
    const o = outcomes.get("ad_a");
    const fatigue =
      o?.kind === "evaluated"
        ? o.detections.find((d) => d.ruleType === "creative_fatigue")
        : undefined;
    expect(fatigue?.evidence).toMatchObject({
      rule: "creative_fatigue",
      window: expect.any(Object),
      ctr: expect.any(Object),
      frequency: expect.any(Object),
    });
  });
});
