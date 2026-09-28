/**
 * Registry of all entity types that participate in the RealGreen sync pipeline.
 *
 * Each key is a human-readable name; each value is the string stored in the
 * `syncMetadata` MongoDB collection as the natural key.
 *
 * To add a new entity to the sync pipeline:
 * 1. Add its key/value here.
 * 2. Create a `sync/` folder inside the entity's module with:
 *    - `[entity]SyncFunc.ts`  — fetchXxx() + bulkUpsertXxx()
 *    - `[Entity]SyncContract.ts`
 *    - `route.ts`
 * 3. Use `SYNC_ENTITY_TYPES.[entity]` as the `entityType` argument to
 *    `getLastSyncedAt` / `setLastSyncedAt`.
 *
 * See realGreenSync.readme.md for the full pattern.
 */
export const SYNC_ENTITY_TYPES = {
  callLog: "callLog",
  customer: "customer",
  program: "program",
  service: "service",
} as const;

export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[keyof typeof SYNC_ENTITY_TYPES];
