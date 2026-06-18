import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSync } from "@/lib/sync/run-sync";

// Operator-triggered sync ("Sync now"). Runs server-side as the signed-in user.
// Optional ?fail= forwards a simulated failure mode to the mock platform so
// reviewers can exercise rate_limit / page2 / auth / timeout end-to-end.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // The user's own connection (RLS guarantees this is theirs).
  const { data: connection } = await supabase
    .from("connections")
    .select("id, account_id")
    .maybeSingle();
  if (!connection) {
    return NextResponse.json(
      { error: "No connected account. Connect an account first." },
      { status: 400 },
    );
  }

  const fail = request.nextUrl.searchParams.get("fail");

  try {
    const result = await runSync({
      connectionId: connection.id,
      userId: user.id,
      accountId: connection.account_id,
      origin: request.nextUrl.origin,
      trigger: "manual",
      fail,
    });
    return NextResponse.json(result);
  } catch (err) {
    // Always return JSON so the client shows a real message, never an HTML 500.
    const message = err instanceof Error ? err.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
