import "server-only";
import accountJson from "../../mock-data/account.json";
import campaignsJson from "../../mock-data/campaigns.json";
import adsJson from "../../mock-data/ads.json";
import page1Json from "../../mock-data/api-responses/success-page1.json";
import page2Json from "../../mock-data/api-responses/success-page2.json";
import rateLimitJson from "../../mock-data/api-responses/rate_limit.json";
import authExpiredJson from "../../mock-data/api-responses/auth_expired.json";
import timeoutJson from "../../mock-data/api-responses/timeout.json";
import type {
  FixtureAccount,
  FixtureCampaign,
  FixtureAd,
  MetricsPage,
  MockApiError,
} from "./types";

// Static fixtures, loaded server-side only. These stand in for a real ad platform.
// Detection never reads ad.signal_profile — it derives everything from metrics.
export const account = accountJson as FixtureAccount;
export const campaigns = campaignsJson as FixtureCampaign[];
export const ads = adsJson as FixtureAd[];

// Pre-built paginated success responses (page 1 = 100 rows, page 2 = 50 rows).
export const successPages: Record<number, MetricsPage> = {
  1: page1Json as MetricsPage,
  2: page2Json as MetricsPage,
};

export const errorEnvelopes = {
  rate_limit: rateLimitJson as MockApiError,
  auth: authExpiredJson as MockApiError,
  timeout: timeoutJson as MockApiError,
};
