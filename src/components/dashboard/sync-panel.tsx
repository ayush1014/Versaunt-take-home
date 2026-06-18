"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import type { SyncResult } from "@/lib/sync/run-sync";

const FAIL_OPTIONS = [
  { value: "", label: "Normal sync" },
  { value: "rate_limit", label: "Simulate: rate limit (429)" },
  { value: "page2", label: "Simulate: page 2 fails" },
  { value: "auth", label: "Simulate: auth expired (401)" },
  { value: "timeout", label: "Simulate: timeout (504)" },
];

export function SyncPanel({ showSimulator = true }: { showSimulator?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fail, setFail] = useState("");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runSyncNow() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const qs = fail ? `?fail=${fail}` : "";
        const res = await fetch(`/api/sync${qs}`, { method: "POST" });
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? "Sync failed to start.");
          return;
        }
        setResult(body as SyncResult);
        router.refresh();
      } catch {
        setError("Could not reach the sync endpoint.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {showSimulator ? (
        <select
          value={fail}
          onChange={(e) => setFail(e.target.value)}
          disabled={pending}
          aria-label="Failure mode simulator"
          className="h-10 rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground backdrop-blur outline-none transition focus:border-foreground/40 disabled:opacity-60"
        >
          {FAIL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}

      <GlassButton
        size="sm"
        onClick={runSyncNow}
        disabled={pending}
        contentClassName="flex items-center gap-2 text-foreground"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Syncing…" : "Sync now"}
      </GlassButton>

      {result ? (
        <span className="text-sm text-muted-foreground">
          {result.status === "completed"
            ? `Synced ${result.rowsUpserted} rows · ${result.tasksCreated} new task(s)`
            : result.status === "partial"
              ? `Partial: ${result.pagesFetched}/${result.totalPages} pages`
              : `Failed: ${result.errorMessage ?? result.errorCode}`}
        </span>
      ) : null}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
