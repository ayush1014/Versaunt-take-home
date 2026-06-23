import { describe, it, expect } from "vitest";
import { stableStringify } from "./stable-stringify";

// stableStringify backs the "evidence unchanged -> no audit event" guard. The
// risk it defends against: Postgres jsonb does not preserve object key order, so
// evidence read back from the DB may have keys in a different order than the
// freshly computed evidence. A naive JSON.stringify would then report a spurious
// change and log a bogus "evidence refreshed" event. These tests pin that down.

describe("stableStringify", () => {
  it("is independent of object key order", () => {
    const a = { ctr: { last: 0.05, prior: 0.07 }, rule: "creative_fatigue" };
    const b = { rule: "creative_fatigue", ctr: { prior: 0.07, last: 0.05 } };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("preserves array order (arrays are positional, not reordered)", () => {
    expect(stableStringify(["2026-06-10", "2026-06-16"])).toBe(
      stableStringify(["2026-06-10", "2026-06-16"]),
    );
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it("distinguishes genuinely different evidence (changed values)", () => {
    const before = { spend: { change_pct: 35.0 }, days: { last: 7 } };
    const after = { spend: { change_pct: 62.0 }, days: { last: 7 } };
    expect(stableStringify(before)).not.toBe(stableStringify(after));
  });

  it("treats matching nested evidence as equal regardless of nesting order", () => {
    const evidence = {
      rule: "spend_spike",
      window: { last: ["2026-06-10", "2026-06-16"], prior: ["2026-06-03", "2026-06-09"] },
      spend: { last: 420, prior: 260, change_pct: 61.5 },
      thresholds: { spend_rise_pct: 35, conversions_flat_pct: 15 },
      campaign_id: null,
    };
    const reordered = {
      campaign_id: null,
      spend: { change_pct: 61.5, prior: 260, last: 420 },
      thresholds: { conversions_flat_pct: 15, spend_rise_pct: 35 },
      window: { prior: ["2026-06-03", "2026-06-09"], last: ["2026-06-10", "2026-06-16"] },
      rule: "spend_spike",
    };
    expect(stableStringify(evidence)).toBe(stableStringify(reordered));
  });

  it("handles primitives and null", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("x")).toBe('"x"');
  });
});
