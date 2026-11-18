import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";

/**
 * `resync` re-upserts one entity's records without wiping anything. It holds the lock (so delta
 * and full syncs cannot overlap it) but, unlike `full`, never blocks mirror queries.
 */
export type SyncOperation = "delta" | "full" | "resync";

/** `wipe` and `finalize` are the bookends of a full sync; the rest load one entity slice. */
export type FullSyncChunkKind = SyncEntityType | "wipe" | "finalize";

/**
 * `running` with no live lock means the request was interrupted (timeout or closed tab).
 * `partial` means a time-limited part finished and more remains: `resumeOffset` is where the next
 * request continues. Anything that is not `done` is retried on resume.
 */
export type FullSyncChunkStatus = "pending" | "running" | "partial" | "done" | "failed";

export type FullSyncChunk = {
  key: string;
  kind: FullSyncChunkKind;
  label: string;
  seasonMin?: number;
  seasonMax?: number;
  status: FullSyncChunkStatus;
  /** Only for steps that do not fit one request (customers). The search offset to continue from. */
  resumeOffset?: number;
  /** Cumulative across the parts of a resumable step. */
  syncedCount?: number;
  durationMs?: number;
  errorMessage?: string;
};

/**
 * Persisted state of a chunked full sync. While one exists for a group, delta syncs
 * refuse to run and mirror queries error, because the mirror is empty or partial.
 * `startedAt` is captured once and used as the upper bound when finding sync edges.
 */
export type FullSyncRun = {
  runId: string;
  startedAt: string;
  chunks: FullSyncChunk[];
};

/**
 * One document per sync group. The lease (`holderRunId` + `expiresAt`) stops overlapping
 * runs; a crashed run's lease simply expires. `fullRun` outlives the lease on purpose so a
 * full sync can be resumed.
 */
export type SyncLockDoc = CreatedUpdated & {
  group: SyncGroup;
  holderRunId: string | null;
  operation: SyncOperation | null;
  lockedAt: string | null;
  expiresAt: string | null;
  fullRun: FullSyncRun | null;
};

export type SyncedCount = {
  entityType: SyncEntityType;
  synced: number;
};

// --- Client-facing status (derived, never stored) ---

export type SyncLockStatus = {
  operation: SyncOperation;
  lockedAt: string;
  expiresAt: string;
  /** False when the lease has expired (a stale lock left by a crashed run). */
  isActive: boolean;
};

export type SyncEntityStatus = {
  entityType: SyncEntityType;
  label: string;
  documentCount: number;
  lastSyncedAt: string | null;
  lastSyncCount: number;
};

export type SyncGroupStatus = {
  group: SyncGroup;
  lock: SyncLockStatus | null;
  fullRun: FullSyncRun | null;
  entities: SyncEntityStatus[];
};
