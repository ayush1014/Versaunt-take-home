import "server-only";
import type { MetricsPage } from "@/lib/types";

// Talks to our mock platform API over HTTP so the ?fail= modes are exercised
// end-to-end, exactly as a real platform client would behave.

const MAX_RETRIES = 2; // total attempts = 1 + MAX_RETRIES
const BACKOFF_MS = [300, 800]; // delay before retry 1, retry 2

// Statuses we consider worth retrying (transient upstream problems).
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export class PlatformError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly terminal: boolean,
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type FetchResult = { page: MetricsPage; attempts: number; retried: boolean };

// Fetches a single page with bounded retry on transient errors.
// Throws PlatformError (terminal=true for auth/4xx, false for exhausted retries).
export async function fetchMetricsPage(
  origin: string,
  accountId: string,
  page: number,
  fail: string | null,
): Promise<FetchResult> {
  const url = new URL("/api/mock-platform/metrics", origin);
  url.searchParams.set("account_id", accountId);
  url.searchParams.set("page", String(page));
  if (fail) url.searchParams.set("fail", fail);

  let lastError: PlatformError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1] ?? 800);

    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch {
      // Network-level failure — treat as retryable.
      lastError = new PlatformError(
        "Network error contacting platform.",
        "NETWORK_ERROR",
        0,
        false,
      );
      continue;
    }

    if (res.ok) {
      const body = (await res.json()) as MetricsPage;
      return { page: body, attempts: attempt + 1, retried: attempt > 0 };
    }

    // Parse the error envelope for a useful code/message.
    const body = await res.json().catch(() => null);
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message = body?.error?.message ?? `Request failed (${res.status}).`;

    // 401 = token expired -> terminal, operator must reconnect.
    if (res.status === 401) {
      throw new PlatformError(message, code, 401, true);
    }
    // Non-retryable client errors -> terminal.
    if (!RETRYABLE.has(res.status)) {
      throw new PlatformError(message, code, res.status, true);
    }

    // Retryable: remember and loop.
    lastError = new PlatformError(message, code, res.status, false);
  }

  // Exhausted retries on a retryable error.
  throw lastError ??
    new PlatformError("Exhausted retries.", "RETRY_EXHAUSTED", 0, false);
}
