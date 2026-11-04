import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import { getSyncSeasonWindow } from "@/app/realGreen/syncMetadata/syncWindow";
import { ENTITY_LABELS, GROUP_LABELS, SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import {
  FullSyncChunk,
  FullSyncChunkKind,
  FullSyncRun,
  SyncLockDoc,
  SyncLockStatus,
} from "@/app/realGreen/syncLock/SyncLockTypes";

/**
 * Longer than the route's `maxDuration` (800s) so a live request can never lose its lease,
 * short enough that a killed request frees the lock soon after it dies.
 */
export const LOCK_LEASE_MS = 15 * 60 * 1000;

export function isLeaseActive({ expiresAt, nowMs }: { expiresAt: string | null; nowMs: number }): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  return !Number.isNaN(expiresMs) && expiresMs > nowMs;
}

export function toLockStatus({ lock, nowMs }: { lock: SyncLockDoc | null; nowMs: number }): SyncLockStatus | null {
  if (!lock || !lock.holderRunId || !lock.operation || !lock.lockedAt || !lock.expiresAt) return null;
  return {
    operation: lock.operation,
    lockedAt: lock.lockedAt,
    expiresAt: lock.expiresAt,
    isActive: isLeaseActive({ expiresAt: lock.expiresAt, nowMs }),
  };
}

/** Explains why a lock request was refused. Pure so the wording is testable. */
export function describeLockBlock({ lock, nowMs }: { lock: SyncLockDoc | null; nowMs: number }): string {
  const status = toLockStatus({ lock, nowMs });
  if (status?.isActive) {
    return `A ${status.operation} sync is already running (started ${status.lockedAt}). Try again when it finishes.`;
  }
  if (lock?.fullRun) {
    return "A full sync was started and not finished. Resume or abandon it from the Sync Utilities page.";
  }
  return "Could not acquire the sync lock. Try again.";
}

function pendingChunk({
  key,
  kind,
  label,
  seasonMin,
  seasonMax,
}: {
  key: string;
  kind: FullSyncChunkKind;
  label: string;
  seasonMin?: number;
  seasonMax?: number;
}): FullSyncChunk {
  return { key, kind, label, seasonMin, seasonMax, status: "pending" };
}

function buildSeasonChunks({
  entityType,
  currentYear,
  floorYear,
  ceilYear,
}: {
  entityType: "program" | "service";
  currentYear: number;
  floorYear: number;
  ceilYear: number;
}): FullSyncChunk[] {
  const label = ENTITY_LABELS[entityType];
  const chunks: FullSyncChunk[] = [];
  for (let season = floorYear; season <= currentYear; season++) {
    chunks.push(
      pendingChunk({
        key: `${entityType}-${season}`,
        kind: entityType,
        label: `${label} ${season}`,
        seasonMin: season,
        seasonMax: season,
      }),
    );
  }
  // Future seasons are sparse (next season is usually the only populated one), so they share one chunk.
  if (ceilYear > currentYear) {
    chunks.push(
      pendingChunk({
        key: `${entityType}-future`,
        kind: entityType,
        label: `${label} ${currentYear + 1}\u2013${ceilYear}`,
        seasonMin: currentYear + 1,
        seasonMax: ceilYear,
      }),
    );
  }
  return chunks;
}

/**
 * Ordered steps of a full sync. Each step runs as its own request so total run time is
 * not bounded by one function's `maxDuration`. Customers have no season, so they are one chunk.
 */
export function buildFullSyncChunks({ group, now }: { group: SyncGroup; now?: Date }): FullSyncChunk[] {
  const wipe = pendingChunk({ key: "wipe", kind: "wipe", label: `Clear ${GROUP_LABELS[group]}` });

  if (group === "callLog") {
    return [wipe, pendingChunk({ key: "callLog", kind: SYNC_ENTITY_TYPES.callLog, label: ENTITY_LABELS.callLog })];
  }

  const { currentYear, floorYear, ceilYear } = getSyncSeasonWindow(now);
  return [
    wipe,
    pendingChunk({ key: "customer", kind: SYNC_ENTITY_TYPES.customer, label: ENTITY_LABELS.customer }),
    ...buildSeasonChunks({ entityType: "program", currentYear, floorYear, ceilYear }),
    ...buildSeasonChunks({ entityType: "service", currentYear, floorYear, ceilYear }),
    pendingChunk({ key: "finalize", kind: "finalize", label: "Record sync checkpoints" }),
  ];
}

/** Returns why `chunkKey` cannot run now, or null when it can. Chunks must run in order. */
export function findChunkBlocker({ run, chunkKey }: { run: FullSyncRun; chunkKey: string }): string | null {
  const index = run.chunks.findIndex((chunk) => chunk.key === chunkKey);
  if (index === -1) return `Unknown step '${chunkKey}'.`;
  if (run.chunks[index].status === "done") return `Step '${run.chunks[index].label}' already finished.`;
  const unfinished = run.chunks.slice(0, index).find((chunk) => chunk.status !== "done");
  if (unfinished) return `Step '${unfinished.label}' must finish first.`;
  return null;
}

/** Returns a copy of `run` with `patch` applied to one chunk. */
export function updateChunk({
  run,
  chunkKey,
  patch,
}: {
  run: FullSyncRun;
  chunkKey: string;
  patch: Partial<FullSyncChunk>;
}): FullSyncRun {
  return {
    ...run,
    chunks: run.chunks.map((chunk) => (chunk.key === chunkKey ? { ...chunk, ...patch } : chunk)),
  };
}

export function isLastChunk({ run, chunkKey }: { run: FullSyncRun; chunkKey: string }): boolean {
  return run.chunks[run.chunks.length - 1]?.key === chunkKey;
}

/** Sums the records loaded by finished chunks of one kind. */
export function sumSyncedCount({ run, kind }: { run: FullSyncRun; kind: FullSyncChunkKind }): number {
  return run.chunks
    .filter((chunk) => chunk.kind === kind && chunk.status === "done")
    .reduce((total, chunk) => total + (chunk.syncedCount ?? 0), 0);
}
