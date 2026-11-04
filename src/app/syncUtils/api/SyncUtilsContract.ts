import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { FullSyncRun, SyncGroupStatus, SyncedCount } from "@/app/realGreen/syncLock/SyncLockTypes";

export type DeltaSyncOutcome = {
  skipped: boolean;
  /** Why the sync did not run. Only set when `skipped` is true. */
  reason?: string;
  durationMs?: number;
  syncedCounts: SyncedCount[];
};

export interface SyncUtilsContract extends ApiContract {
  /** Lock state, unfinished full-sync run, and per-collection counts and checkpoints. */
  getSyncStatus: {
    params: { group: SyncGroup };
    result: DataResponse<SyncGroupStatus>;
  };

  /** Runs one delta sync for the group. Refused (not queued) while any lock is held. */
  runDeltaSync: {
    params: { group: SyncGroup };
    result: DataResponse<DeltaSyncOutcome>;
  };

  /**
   * Verifies the password, then creates the full-sync run and wipes the group's collections.
   * The client then calls `runFullSyncChunk` for each remaining step in order.
   */
  startFullSync: {
    params: { group: SyncGroup; password: string };
    result: DataResponse<FullSyncRun>;
  };

  /** Runs one step of the current full sync. Safe to repeat after a failure or timeout. */
  runFullSyncChunk: {
    params: { group: SyncGroup; chunkKey: string };
    result: DataResponse<FullSyncRun>;
  };

  /**
   * Admin escape hatch: frees a stuck lock. With `abandonRun` it also discards an unfinished
   * full sync, and the next delta sync then does a normal initial load.
   */
  clearSyncLock: {
    params: { group: SyncGroup; abandonRun: boolean };
    result: DataResponse<null>;
  };
}
