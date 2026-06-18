import { createClient } from "@/lib/supabase/server";
import {
  ActivityLogs,
  type ActivityEvent,
} from "@/components/dashboard/activity-logs";

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from("connections")
    .select("id")
    .maybeSingle();
  if (!connection) return null; // layout shows the connect screen

  const { data: events } = await supabase
    .from("events")
    .select("id, type, message, created_at, data")
    .order("created_at", { ascending: false })
    .limit(500);

  return <ActivityLogs events={(events ?? []) as ActivityEvent[]} />;
}
