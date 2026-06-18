import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSync } from "@/lib/sync/run-sync";

// Scheduled sync for every active connection. Triggered by Vercel Cron, which
// sends "Authorization: Bearer <CRON_SECRET>". Guarded so only an authorized
// caller can run it. Uses the service role to sync across all tenants.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("connections")
    .select("id, user_id, account_id")
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const results = [];
  // Sequential to stay within the function time budget and avoid hammering
  // the (mock) platform. Fleets of connections would move to a queue.
  for (const c of connections ?? []) {
    const result = await runSync({
      connectionId: c.id,
      userId: c.user_id,
      accountId: c.account_id,
      origin,
      trigger: "cron",
    });
    results.push({ connectionId: c.id, status: result.status });
  }

  return NextResponse.json({ ran: results.length, results });
}
