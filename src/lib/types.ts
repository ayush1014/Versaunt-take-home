// Shapes for the mock-data fixtures and the metric rows that flow through the pipeline.

export type FixtureAccount = {
  id: string;
  name: string;
  platform: string;
  currency: string;
  timezone: string;
  status: string;
};

export type FixtureCampaign = {
  id: string;
  account_id: string;
  name: string;
  status: string;
  objective: string;
};

export type FixtureAd = {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  creative_type: string;
  // signal_profile is for reviewers only — detection must NOT read it.
  signal_profile?: string;
};

// A single daily metric row, as returned by the mock platform API.
export type MetricRow = {
  date: string;
  ad_id: string;
  campaign_id: string;
  account_id: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  frequency: number;
};

// Paginated success envelope from the mock platform API.
export type MetricsPage = {
  page: number;
  page_size: number;
  total_pages: number;
  total_rows: number;
  account_id: string;
  data: MetricRow[];
};

// Error envelope from the mock platform API (rate_limit / auth / timeout).
export type MockApiError = {
  error: {
    code: string;
    message: string;
    retry_after_seconds?: number;
    retryable?: boolean;
  };
};

export type SyncStatus = "running" | "completed" | "partial" | "failed";
export type TaskRuleType = "creative_fatigue" | "spend_spike";
export type TaskStatus = "open" | "resolved" | "dismissed";
export type TaskSeverity = "info" | "warning" | "critical";
