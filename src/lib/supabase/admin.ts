import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS, so it must ONLY ever run on the server
// (sync worker, cron). The "server-only" import makes the build fail if this
// file is ever pulled into a client bundle, protecting the secret key.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
