// Date-window math for trend detection: "last 7 days" vs "prior 7 days",
// anchored on the most recent date present in the data. Gaps are handled by
// averaging over whatever days exist in each window (not assuming 7).

export type MetricSample = {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  frequency: number;
};

export type WindowAgg = {
  days: number;
  avgCtr: number;
  avgFrequency: number;
  avgSpend: number;
  avgConversions: number;
  avgClicks: number;
  avgImpressions: number;
};

export type Windows = {
  period: string; // anchor (most recent date)
  lastStart: string;
  lastEnd: string;
  priorStart: string;
  priorEnd: string;
};

function toUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, delta: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return fmt(d);
}

// Builds 7-day last/prior windows anchored on the most recent date.
export function computeWindows(maxDate: string): Windows {
  return {
    period: maxDate,
    lastStart: addDays(maxDate, -6),
    lastEnd: maxDate,
    priorStart: addDays(maxDate, -13),
    priorEnd: addDays(maxDate, -7),
  };
}

export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end; // ISO date strings compare lexically
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Aggregates a window's daily samples into per-day averages.
export function aggregate(samples: MetricSample[]): WindowAgg {
  return {
    days: samples.length,
    avgCtr: mean(samples.map((s) => s.ctr)),
    avgFrequency: mean(samples.map((s) => s.frequency)),
    avgSpend: mean(samples.map((s) => s.spend)),
    avgConversions: mean(samples.map((s) => s.conversions)),
    avgClicks: mean(samples.map((s) => s.clicks)),
    avgImpressions: mean(samples.map((s) => s.impressions)),
  };
}
