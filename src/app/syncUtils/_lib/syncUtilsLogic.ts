import { FullSyncChunk, FullSyncRun } from "@/app/realGreen/syncLock/SyncLockTypes";

/** Chunks the page still has to request, in order. The wipe only ever runs from the password-gated start. */
export function getRemainingChunks(run: FullSyncRun): FullSyncChunk[] {
  return run.chunks.filter((chunk) => chunk.kind !== "wipe" && chunk.status !== "done");
}

export function summarizeRunProgress(run: FullSyncRun): { doneCount: number; totalCount: number } {
  return {
    doneCount: run.chunks.filter((chunk) => chunk.status === "done").length,
    totalCount: run.chunks.length,
  };
}

/** A run whose wipe never finished holds no destructive state and can simply be started again. */
export function isWipeComplete(run: FullSyncRun): boolean {
  return run.chunks.find((chunk) => chunk.kind === "wipe")?.status === "done";
}

export function formatDuration(durationMs: number): string {
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
}
