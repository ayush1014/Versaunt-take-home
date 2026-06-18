import { NextResponse, type NextRequest } from "next/server";
import { account, successPages, errorEnvelopes } from "@/lib/fixtures";

// Mock external ad platform. Stands in for Meta/Google/TikTok.
// Serves paginated fixtures and simulates failure modes via ?fail=.
// This route is intentionally public (no operator auth) — it mimics a
// third-party API that the sync worker calls server-to-server, and that
// reviewers can exercise directly with curl/browser.

export const dynamic = "force-dynamic";

type FailMode = "rate_limit" | "page2" | "auth" | "timeout";
const FAIL_MODES: FailMode[] = ["rate_limit", "page2", "auth", "timeout"];

function resolveFail(param: string | null): FailMode | null {
  // Query param wins; fall back to env for local testing convenience.
  const value = param ?? process.env.MOCK_PLATFORM_FAIL ?? "";
  return FAIL_MODES.includes(value as FailMode) ? (value as FailMode) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountId = searchParams.get("account_id");
  const page = Number(searchParams.get("page") ?? "1");
  const fail = resolveFail(searchParams.get("fail"));

  // account_id is required and must match the known mock account.
  if (!accountId) {
    return NextResponse.json(
      { error: { code: "MISSING_ACCOUNT_ID", message: "account_id is required." } },
      { status: 400 },
    );
  }
  if (accountId !== account.id) {
    return NextResponse.json(
      { error: { code: "UNKNOWN_ACCOUNT", message: `Unknown account_id: ${accountId}` } },
      { status: 404 },
    );
  }

  // --- Failure simulations -------------------------------------------------

  // 401: token expired. Terminal — operator must reconnect.
  if (fail === "auth") {
    return NextResponse.json(errorEnvelopes.auth, { status: 401 });
  }

  // 429: rate limited. Retryable.
  if (fail === "rate_limit") {
    return NextResponse.json(errorEnvelopes.rate_limit, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  // 504: gateway timeout. Retryable. (We return immediately rather than hang
  // so we never hold a serverless function open for 30s.)
  if (fail === "timeout") {
    return NextResponse.json(errorEnvelopes.timeout, { status: 504 });
  }

  // page2: page 1 succeeds, page 2 fails mid-pagination -> honest partial sync.
  if (fail === "page2" && page >= 2) {
    return NextResponse.json(
      {
        error: {
          code: "PAGE_FETCH_FAILED",
          message: "Failed to fetch page 2 from upstream platform.",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }

  // --- Success -------------------------------------------------------------

  const body = successPages[page];
  if (!body) {
    return NextResponse.json(
      { error: { code: "INVALID_PAGE", message: `No such page: ${page}` } },
      { status: 400 },
    );
  }

  return NextResponse.json(body, { status: 200 });
}
