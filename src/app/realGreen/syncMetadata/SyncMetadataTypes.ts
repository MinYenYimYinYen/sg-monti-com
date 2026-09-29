import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";

/**
 * Represents one row in the `syncMetadata` MongoDB collection.
 * There is exactly one document per entity type that has ever been synced.
 *
 * `entityType` is the natural key — use values from `SYNC_ENTITY_TYPES`.
 * `lastSyncedAt` is the adjusted ISO 8601 timestamp stored for the next sync's window start
 * (edge timestamp minus comfort buffer). It is only updated when records were fetched.
 *
 * See realGreenSync.readme.md and MirrorSyncRefactor.md for the full sync architecture.
 */
export type SyncMetadata = CreatedUpdated & {
  entityType: SyncEntityType;
  lastSyncedAt: string;
  /** Total records fetched in the last sync. */
  lastSyncCount: number;
  /**
   * Number of binary search iterations used to find the sync edge via the Reporting endpoint.
   * 0 if the fixed-buffer fallback was used (e.g., service entity when endpoint is unavailable).
   */
  lastSyncEdgeIterations: number;
  /** Comfort buffer subtracted from the discovered edge before storing as lastSyncedAt (seconds). */
  lastSyncBufferSeconds: number;
};
