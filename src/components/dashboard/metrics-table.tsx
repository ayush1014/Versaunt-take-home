import { fmtNumber, fmtCurrency, fmtPercent, fmtDecimal } from "@/lib/format";

export type MetricRowView = {
  adId: string;
  adName: string;
  campaignName: string;
  creativeType: string | null;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  frequency: number;
};

// Per-ad current metrics. Glass card frame, readable table body.
export function MetricsTable({ rows }: { rows: MetricRowView[] }) {
  return (
    <section id="metrics" className="glass-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Metrics summary</h2>
          <p className="text-xs text-muted-foreground">
            Latest snapshot per ad
          </p>
        </div>
        <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {rows.length} ads
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No metrics yet. Run a sync to ingest performance data.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Ad</th>
                <th className="px-3 py-2.5 text-right font-medium">Impr.</th>
                <th className="px-3 py-2.5 text-right font-medium">Clicks</th>
                <th className="px-3 py-2.5 text-right font-medium">Spend</th>
                <th className="px-3 py-2.5 text-right font-medium">CTR</th>
                <th className="px-3 py-2.5 text-right font-medium">Freq.</th>
                <th className="px-5 py-2.5 text-right font-medium">Conv.</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((r) => (
                <tr
                  key={r.adId}
                  className="border-t border-border/40 transition hover:bg-foreground/[0.03]"
                >
                  <td className="px-5 py-3">
                    <div className="font-sans font-medium text-foreground">
                      {r.adName}
                    </div>
                    <div className="font-sans text-xs text-muted-foreground">
                      {r.campaignName}
                      {r.creativeType ? ` · ${r.creativeType}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {fmtNumber(r.impressions)}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {fmtNumber(r.clicks)}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {fmtCurrency(r.spend)}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {fmtPercent(r.ctr)}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {fmtDecimal(r.frequency, 1)}
                  </td>
                  <td className="px-5 py-3 text-right text-foreground">
                    {fmtNumber(r.conversions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
