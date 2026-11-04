"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { FullSyncChunk, FullSyncRun } from "@/app/realGreen/syncLock/SyncLockTypes";
import { formatDuration, summarizeRunProgress } from "@/app/syncUtils/_lib/syncUtilsLogic";

function ChunkIcon({ chunk }: { chunk: FullSyncChunk }) {
  switch (chunk.status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />;
    case "running":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
    case "failed":
      return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
    default:
      return <Circle className="h-4 w-4 shrink-0 text-foreground/30" />;
  }
}

/** Per-step progress of a full sync, including the error for a failed step. */
export function FullSyncChecklist({ run }: { run: FullSyncRun }) {
  const { doneCount, totalCount } = summarizeRunProgress(run);

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
        <span className="font-semibold text-foreground">Full sync progress</span>
        <span className="text-foreground/60">
          {doneCount} of {totalCount} steps
        </span>
      </div>
      <ul className="divide-y divide-border">
        {run.chunks.map((chunk) => (
          <li key={chunk.key} className="px-4 py-1.5 text-sm">
            <div className="flex items-center gap-2">
              <ChunkIcon chunk={chunk} />
              <span className="flex-1 text-foreground">{chunk.label}</span>
              {chunk.status === "done" && chunk.kind !== "wipe" && chunk.kind !== "finalize" && (
                <span className="text-foreground/60">{(chunk.syncedCount ?? 0).toLocaleString()} records</span>
              )}
              {chunk.durationMs !== undefined && (
                <span className="w-16 text-right font-mono text-xs text-foreground/50">
                  {formatDuration(chunk.durationMs)}
                </span>
              )}
            </div>
            {chunk.status === "failed" && chunk.errorMessage && (
              <p className="mt-1 pl-6 text-xs text-destructive">{chunk.errorMessage}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
