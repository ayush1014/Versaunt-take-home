"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { account, campaigns, ads } from "@/lib/fixtures";

// Connects the mock ad account for the signed-in operator and seeds entity
// metadata (campaigns + ads) so the UI can show real names. Idempotent:
// re-connecting upserts instead of duplicating.
export async function connectAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();

  // 1) Link the account (one per user/account).
  const { data: connection, error: connErr } = await admin
    .from("connections")
    .upsert(
      {
        user_id: user.id,
        account_id: account.id,
        account_name: account.name,
        platform: account.platform,
        currency: account.currency,
        timezone: account.timezone,
        status: "active",
      },
      { onConflict: "user_id,account_id" },
    )
    .select("id")
    .single();

  if (connErr || !connection) {
    return { error: connErr?.message ?? "Could not connect account." };
  }

  // 2) Seed campaigns + ads from fixtures (upsert keeps it idempotent).
  const { error: campErr } = await admin.from("campaigns").upsert(
    campaigns.map((c) => ({
      connection_id: connection.id,
      user_id: user.id,
      platform_campaign_id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
    })),
    { onConflict: "connection_id,platform_campaign_id" },
  );
  if (campErr) return { error: campErr.message };

  const { error: adsErr } = await admin.from("ads").upsert(
    ads.map((a) => ({
      connection_id: connection.id,
      user_id: user.id,
      platform_ad_id: a.id,
      platform_campaign_id: a.campaign_id,
      name: a.name,
      status: a.status,
      creative_type: a.creative_type,
      // signal_profile intentionally NOT stored — detection derives from metrics.
    })),
    { onConflict: "connection_id,platform_ad_id" },
  );
  if (adsErr) return { error: adsErr.message };

  // 3) Audit trail.
  await admin.from("events").insert({
    user_id: user.id,
    connection_id: connection.id,
    type: "account_connected",
    message: `Connected ${account.name} (${account.id})`,
    data: { account_id: account.id, campaigns: campaigns.length, ads: ads.length },
  });

  revalidatePath("/");
  return {};
}
