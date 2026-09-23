import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";

/**
 * Represents one row in the `syncMetadata` MongoDB collection.
 * There is exactly one document per entity type that has ever been synced.
 *
 * `entityType` is the natural key — use values from `SYNC_ENTITY_TYPES`.
 * `lastSyncedAt` is the ISO 8601 timestamp of the last successful sync completion.
 *
 * See realGreenSync.readme.md for the full sync architecture.
 */
export type SyncMetadata = CreatedUpdated & {
  entityType: SyncEntityType;
  lastSyncedAt: string;
};
