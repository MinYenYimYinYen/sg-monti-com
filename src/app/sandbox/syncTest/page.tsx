"use client";

import { useState } from "react";

type SyncStatus = "idle" | "pending" | "success" | "error";

type SyncResult = {
  synced: number;
  lastSyncedAt: string;
};

export default function SyncTestPage() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncType, setSyncType] = useState<"full" | "delta" | null>(null);

  const runSync = async (force: boolean) => {
    setStatus("pending");
    setResult(null);
    setErrorMsg(null);
    setSyncType(force ? "full" : "delta");

    try {
      const res = await fetch("/realGreen/callLog/sync/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "syncCallLogs", ...(force ? { force: true } : {}) }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.payload);
        setStatus("success");
      } else {
        setErrorMsg(data.message ?? "Sync failed — check server console for details.");
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-foreground">CallLog Sync Test</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Triggers the callLog sync endpoint. Watch the{" "}
            <span className="font-mono text-foreground/80">dev server console</span> for the
            round-by-round algorithm trace.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            className="rounded bg-primary text-primary-foreground py-2 px-5 font-medium disabled:opacity-50"
            onClick={() => runSync(true)}
            disabled={status === "pending"}
          >
            Full Sync
          </button>
          <button
            className="rounded bg-accent/20 text-foreground border border-accent/30 py-2 px-5 font-medium disabled:opacity-50"
            onClick={() => runSync(false)}
            disabled={status === "pending"}
          >
            Delta Sync
          </button>
        </div>

        {/* Console reminder */}
        <div className="rounded-md bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-foreground/70">
          <span className="font-semibold text-foreground">Watch the dev server console</span> for
          real-time algorithm output:
          <pre className="mt-2 text-xs text-foreground/60 whitespace-pre-wrap">
{`[callLog sync] Round 0 — batchCount: 1, offsets: [0]
[callLog sync] Round 0 — results: [500] — continuing
[callLog sync] Round 1 — batchCount: 2, offsets: [500, 1000]
...
[callLog sync] Fetch complete — N API calls, N records fetched
[callLog sync] Upsert complete — N records written to MongoDB
[callLog sync] Sync complete — N records synced, lastSyncedAt: ...`}
          </pre>
        </div>

        {/* Status */}
        {status === "pending" && (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground/70">
            <span className="font-semibold text-foreground">
              {syncType === "full" ? "Full sync" : "Delta sync"} running…
            </span>{" "}
            This may take a while for a full load. Check the server console.
          </div>
        )}

        {status === "success" && result && (
          <div className="rounded-md border border-accent/30 bg-accent/10 px-4 py-3 space-y-1 text-sm">
            <p className="font-semibold text-foreground">
              ✓ {syncType === "full" ? "Full sync" : "Delta sync"} complete
            </p>
            <p className="text-foreground/70">
              <span className="font-medium text-foreground">Records synced:</span>{" "}
              {result.synced.toLocaleString()}
            </p>
            <p className="text-foreground/70">
              <span className="font-medium text-foreground">lastSyncedAt:</span>{" "}
              <span className="font-mono text-xs">{result.lastSyncedAt}</span>
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <p className="font-semibold text-destructive">Sync failed</p>
            <p className="text-foreground/70 mt-1">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
