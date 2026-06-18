// Locale-aware formatting for the operator UI. Tabular figures keep columns
// aligned in tables.

const numberFmt = new Intl.NumberFormat("en-US");
const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const fmtNumber = (n: number) => numberFmt.format(n);
export const fmtCurrency = (n: number) => currencyFmt.format(n);
export const fmtPercent = (ratio: number) => `${(ratio * 100).toFixed(2)}%`;
export const fmtDecimal = (n: number, dp = 1) => n.toFixed(dp);

// Absolute timestamp, e.g. "Jun 17, 6:42 PM".
export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Compact relative time, e.g. "3m ago", "2h ago".
export function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
