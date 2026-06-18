import { createClient } from "@/lib/supabase/server";
import { IssuesGrid, type IssueView } from "@/components/dashboard/issues-grid";

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 } as const;

export default async function IssuesPage() {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from("connections")
    .select("id")
    .maybeSingle();
  if (!connection) return null; // layout shows the connect screen

  const [{ data: taskRows }, { data: adRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, ad_id, campaign_id, rule_type, severity, status, title, description, evidence, last_detected_at",
      ),
    supabase.from("ads").select("platform_ad_id, name"),
  ]);

  const adMap = new Map(
    (adRows ?? []).map((a) => [a.platform_ad_id, a.name as string]),
  );

  const issues: IssueView[] = ((taskRows ?? []) as IssueView[])
    .map((t) => ({
      ...t,
      adName: adMap.get(t.ad_id) ?? t.ad_id,
      evidence: (t.evidence ?? {}) as Record<string, unknown>,
    }))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sev !== 0) return sev;
      return a.last_detected_at < b.last_detected_at ? 1 : -1;
    });

  return <IssuesGrid issues={issues} />;
}
