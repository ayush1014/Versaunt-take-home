import type { TaskRuleType, TaskSeverity } from "@/lib/types";
import type { WindowAgg, Windows } from "./windows";

// Input a rule sees for a single ad: aggregated last/prior windows + context.
export type RuleInput = {
  adId: string;
  adName: string;
  campaignId: string | null;
  last: WindowAgg;
  prior: WindowAgg;
  windows: Windows;
};

export type Detection = {
  ruleType: TaskRuleType;
  severity: TaskSeverity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
};

export type Rule = {
  type: TaskRuleType;
  evaluate: (input: RuleInput) => Detection | null;
};

const round = (n: number, dp = 2) => Number(n.toFixed(dp));
const pct = (n: number) => Number((n * 100).toFixed(1));

// --- Creative fatigue ------------------------------------------------------
// CTR declines materially over the last 7 days while frequency rises — the
// classic sign that an audience has seen a creative too many times.
const CTR_DROP_THRESHOLD = 0.15; // >= 15% relative CTR decline
const FREQ_RISE_THRESHOLD = 0.5; // >= +0.5 average frequency

const creativeFatigue: Rule = {
  type: "creative_fatigue",
  evaluate: ({ adId, adName, campaignId, last, prior, windows }) => {
    if (prior.avgCtr <= 0) return null; // no baseline to compare against

    const ctrChange = (last.avgCtr - prior.avgCtr) / prior.avgCtr; // negative = decline
    const freqDelta = last.avgFrequency - prior.avgFrequency;

    if (ctrChange > -CTR_DROP_THRESHOLD || freqDelta < FREQ_RISE_THRESHOLD) {
      return null;
    }

    const dropPct = -pct(ctrChange); // positive number for display
    const severity: TaskSeverity = dropPct >= 25 ? "critical" : "warning";

    return {
      ruleType: "creative_fatigue",
      severity,
      title: `Creative fatigue — ${adName}`,
      description: `CTR fell ${dropPct.toFixed(0)}% over the last 7 days while average frequency rose from ${prior.avgFrequency.toFixed(1)} to ${last.avgFrequency.toFixed(1)}. Refresh the creative for ${adName}.`,
      evidence: {
        rule: "creative_fatigue",
        ad_id: adId,
        campaign_id: campaignId,
        window: {
          last: [windows.lastStart, windows.lastEnd],
          prior: [windows.priorStart, windows.priorEnd],
        },
        ctr: {
          last: round(last.avgCtr, 5),
          prior: round(prior.avgCtr, 5),
          change_pct: pct(ctrChange),
        },
        frequency: {
          last: round(last.avgFrequency, 3),
          prior: round(prior.avgFrequency, 3),
          delta: round(freqDelta, 3),
        },
        days: { last: last.days, prior: prior.days },
        thresholds: { ctr_drop_pct: 15, frequency_rise: 0.5 },
      },
    };
  },
};

// --- Spend spike -----------------------------------------------------------
// Spend climbs sharply while conversions stay flat — budget is being burned
// without a matching return.
const SPEND_RISE_THRESHOLD = 0.35; // >= 35% spend increase
const CONV_FLAT_THRESHOLD = 0.15; // conversions changed by <= 15%

const spendSpike: Rule = {
  type: "spend_spike",
  evaluate: ({ adId, adName, campaignId, last, prior, windows }) => {
    if (prior.avgSpend <= 0) return null;

    const spendChange = (last.avgSpend - prior.avgSpend) / prior.avgSpend;
    const convChange =
      prior.avgConversions > 0
        ? (last.avgConversions - prior.avgConversions) / prior.avgConversions
        : 0;

    // Spend up sharply AND conversions not rising to match.
    if (spendChange < SPEND_RISE_THRESHOLD || convChange > CONV_FLAT_THRESHOLD) {
      return null;
    }

    const risePct = pct(spendChange);
    const severity: TaskSeverity = risePct >= 60 ? "critical" : "warning";

    return {
      ruleType: "spend_spike",
      severity,
      title: `Spend spike — ${adName}`,
      description: `Spend rose ${risePct.toFixed(0)}% over the last 7 days while conversions stayed roughly flat (${prior.avgConversions.toFixed(1)} → ${last.avgConversions.toFixed(1)} per day). Review budget and targeting for ${adName}.`,
      evidence: {
        rule: "spend_spike",
        ad_id: adId,
        campaign_id: campaignId,
        window: {
          last: [windows.lastStart, windows.lastEnd],
          prior: [windows.priorStart, windows.priorEnd],
        },
        spend: {
          last: round(last.avgSpend),
          prior: round(prior.avgSpend),
          change_pct: risePct,
        },
        conversions: {
          last: round(last.avgConversions, 2),
          prior: round(prior.avgConversions, 2),
          change_pct: pct(convChange),
        },
        days: { last: last.days, prior: prior.days },
        thresholds: { spend_rise_pct: 35, conversions_flat_pct: 15 },
      },
    };
  },
};

// The registry. Adding a new rule is a one-line change here.
export const RULES: Rule[] = [creativeFatigue, spendSpike];
